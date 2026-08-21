import type { NextFunction, Request, Response } from 'express';
import { ValidationError } from '../errors.js';
import { clientIdSchema } from '../schemas/common.js';

/**
 * Requires a valid anonymous client identifier on the `X-Client-Id` header.
 * This is a temporary demo mechanism for scoping carts/wishlists/orders
 * without accounts — it is NOT authentication (see docs/api.md).
 */
export function requireClientId(req: Request, res: Response, next: NextFunction): void {
  const raw = req.header('x-client-id');
  const parsed = clientIdSchema.safeParse(raw);
  if (!parsed.success) {
    return next(
      new ValidationError('Missing or invalid X-Client-Id header', [
        { path: 'x-client-id', message: 'A valid client id is required' },
      ])
    );
  }
  res.locals.clientId = parsed.data;
  next();
}
