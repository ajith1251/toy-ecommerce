import type { NextFunction, Request, Response } from 'express';
import { log } from '../observability/logger.js';
import { requestIdOf } from '../observability/requestContext.js';

/**
 * Logs method, path, status and duration for every request, correlated by
 * the request id. Bodies are never logged — checkout requests contain
 * payment data. The authenticated user id is included when the session
 * middleware has already resolved one (safe metadata, no PII beyond it).
 */
export function requestLogger() {
  return (req: Request, res: Response, next: NextFunction) => {
    const start = performance.now();
    res.on('finish', () => {
      const durationMs = Math.round(performance.now() - start);
      const fields = {
        requestId: requestIdOf(res),
        method: req.method,
        path: req.originalUrl,
        status: res.statusCode,
        durationMs,
        userId: (res.locals.user?.userId as number | undefined) ?? undefined,
      };
      const msg = `${req.method} ${req.originalUrl} ${res.statusCode} ${durationMs}ms`;
      if (res.statusCode >= 500) log.error(msg, fields);
      else if (res.statusCode >= 400) log.warn(msg, fields);
      else log.info(msg, fields);
    });
    next();
  };
}
