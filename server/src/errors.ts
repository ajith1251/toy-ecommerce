export type ApiErrorCode =
  | 'bad_request'
  | 'validation'
  | 'unauthorized'
  | 'forbidden'
  | 'not_found'
  | 'conflict'
  | 'insufficient_stock'
  | 'rate_limited'
  | 'internal';

export class ApiError extends Error {
  readonly status: number;
  readonly code: ApiErrorCode;
  readonly details?: unknown;

  constructor(status: number, code: ApiErrorCode, message: string, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export class UnauthorizedError extends ApiError {
  constructor(message = 'Authentication required') {
    super(401, 'unauthorized', message);
  }
}

export class ForbiddenError extends ApiError {
  constructor(message = 'Forbidden') {
    super(403, 'forbidden', message);
  }
}

export class NotFoundError extends ApiError {
  constructor(message = 'Resource not found') {
    super(404, 'not_found', message);
  }
}

export class ValidationError extends ApiError {
  constructor(message = 'Invalid input', details?: unknown) {
    super(400, 'validation', message, details);
  }
}

export class ConflictError extends ApiError {
  constructor(message = 'Conflict', details?: unknown) {
    super(409, 'conflict', message, details);
  }
}

/** Raised when an order cannot be fulfilled (stock changed since add-to-cart). */
export class InsufficientStockError extends ApiError {
  constructor(details?: { productId: number; requested: number; available: number }) {
    super(409, 'insufficient_stock', 'One or more items are no longer available in the requested quantity', details);
  }
}

/** Maps an unknown error to a safe 500 response (details logged server-side only). */
export function toInternalError(err: unknown): ApiError {
  if (err instanceof ApiError) return err;
  const message = err instanceof Error ? err.message : 'Unknown error';
  return new ApiError(500, 'internal', 'An unexpected error occurred', undefined);
}
