import type { NextFunction, Request, Response } from 'express';
import type { ZodType } from 'zod';
import { ValidationError } from '../errors.js';

type Source = 'body' | 'query' | 'params';

/**
 * Validates a request section against a zod schema. On failure responds with
 * a 400 `{ error: { code: 'validation', details: [...] } }`. On success the
 * parsed (coerced/defaulted) value is attached to `res.locals.validated`
 * (Express 5 exposes `req.query` as a read-only getter, so query results
 * cannot be written back onto the request).
 */
export function validate(schema: ZodType, source: Source = 'body') {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      const details = result.error.issues.map(issue => ({
        path: issue.path.join('.'),
        message: issue.message,
      }));
      return next(new ValidationError(`Invalid ${source}`, details));
    }
    res.locals.validated = { ...(res.locals.validated ?? {}), [source]: result.data };
    next();
  };
}
