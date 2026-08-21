import { randomUUID } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';

/**
 * Per-request correlation id. Accepted from a trusted proxy's `X-Request-Id`
 * (or generated when absent), echoed back on the response, and attached to
 * every log line and error envelope so a customer-reported failure can be
 * traced end-to-end through the logs.
 */
export function attachRequestId(): (req: Request, res: Response, next: NextFunction) => void {
  return (req, res, next) => {
    const incoming = req.header('x-request-id');
    const requestId =
      incoming && /^[A-Za-z0-9_-]{8,64}$/.test(incoming) ? incoming : randomUUID();
    res.locals.requestId = requestId;
    res.setHeader('X-Request-Id', requestId);
    next();
  };
}

/** The correlation id for the current request (set by `attachRequestId`). */
export function requestIdOf(res: Response): string | undefined {
  return res.locals.requestId as string | undefined;
}
