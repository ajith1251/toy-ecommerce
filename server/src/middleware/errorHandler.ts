import type { ErrorRequestHandler, NextFunction, Request, Response } from 'express';
import { toInternalError } from '../errors.js';
import { log } from '../observability/logger.js';
import { captureException } from '../observability/errorTracking.js';
import { requestIdOf } from '../observability/requestContext.js';

/**
 * Central error handler. Every failure — validation, not-found, conflict,
 * unexpected — becomes `{ error: { code, message, requestId? } }`. Internal
 * details (SQL errors, stack traces, credentials) are logged server-side
 * only and never exposed to clients; 5xx errors are additionally reported
 * to the configured error tracker with the request id for correlation.
 */
export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction): void {
  const apiErr = toInternalError(err);
  const requestId = requestIdOf(res);

  if (apiErr.status >= 500) {
    const detail = err instanceof Error ? err.stack : String(err);
    log.error(`internal error ${req.method} ${req.originalUrl} → ${apiErr.status} ${apiErr.message}`, {
      requestId,
      method: req.method,
      path: req.originalUrl,
      status: apiErr.status,
      detail,
    });
    captureException(err, { requestId, path: req.originalUrl, method: req.method });
  } else {
    log.warn(`${req.method} ${req.originalUrl} → ${apiErr.status} ${apiErr.message}`, {
      requestId,
      status: apiErr.status,
    });
  }

  const body: Record<string, unknown> = { error: { code: apiErr.code, message: apiErr.message } };
  if (apiErr.details !== undefined) {
    (body.error as Record<string, unknown>).details = apiErr.details;
  }
  if (requestId !== undefined) {
    // Lets a customer quote an id support can grep for — contains no secrets.
    (body.error as Record<string, unknown>).requestId = requestId;
  }
  res.status(apiErr.status).json(body);
}

/** Re-throws async errors for Express 5's native async handling. */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>
): (req: Request, res: Response, next: NextFunction) => void {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
}
