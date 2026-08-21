import type { NextFunction, Request, Response } from 'express';
import type { ServerConfig } from '../config.js';
import { UnauthorizedError, ForbiddenError } from '../errors.js';
import type { SessionRepository } from '../repositories/sessionRepository.js';
import type { UserRepository } from '../repositories/userRepository.js';
import { hashToken } from '../utils/auth.js';

export interface AuthDeps {
  sessionRepo: SessionRepository;
  userRepo: UserRepository;
  config: Pick<ServerConfig, 'auth'>;
}

/** Extracts the raw session token from the HttpOnly cookie, if present. */
function readSessionToken(req: Request, cookieName: string): string | null {
  const header = req.headers.cookie;
  if (!header) return null;
  for (const part of header.split(';')) {
    const [name, ...rest] = part.trim().split('=');
    if (name === cookieName) return rest.join('=');
  }
  return null;
}

/**
 * `optionalAuth` — resolves the session when a valid cookie is present and
 * exposes `res.locals.user = { sessionId, userId }`; anonymous requests pass
 * through untouched (guests keep X-Client-Id scoping).
 */
export function optionalAuth({ sessionRepo, config }: AuthDeps) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const token = readSessionToken(req, config.auth.cookieName);
    if (token) {
      const session = await sessionRepo.findValidSession(hashToken(token));
      if (session) {
        res.locals.user = session;
        res.locals.sessionToken = token;
      }
    }
    next();
  };
}

/**
 * `requireAuth` — 401 unless a valid authenticated session exists.
 * Must run after `optionalAuth` (or resolve the session itself).
 */
export function requireAuth({ userRepo }: AuthDeps) {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!res.locals.user) {
      return next(new UnauthorizedError('Authentication required'));
    }
    
    // Verify the user still exists and is active
    const user = await userRepo.findById(res.locals.user.userId);
    if (!user || user.status !== 'active') {
      return next(new UnauthorizedError('Invalid or inactive user'));
    }
    
    // Attach the full user object to res.locals for downstream use
    res.locals.currentUser = user;
    next();
  };
}

/**
 * `requireAdmin` — 403 unless the authenticated user has the admin role.
 * Must run after `requireAuth`.
 */
export function requireAdmin(_deps: AuthDeps) {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = res.locals.currentUser as import('../types.js').UserDto | undefined;
    if (!user || user.role !== 'admin') {
      return next(new ForbiddenError('Admin access required'));
    }
    next();
  };
}

/**
 * CSRF defense-in-depth for cookie-based auth: rejects mutating requests
 * whose Origin header (browsers always send it for cross-origin fetches /
 * form posts) is not in the configured allowlist. SameSite=Lax is the
 * primary protection; this catches same-site subdomain and form tricks.
 */
export function sameOrigin(corsOrigins: string[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!['POST', 'PATCH', 'PUT', 'DELETE'].includes(req.method)) return next();
    const origin = req.header('origin');
    // Non-browser clients (curl, supertest, same-origin fetches) send no Origin.
    if (!origin || corsOrigins.includes(origin)) return next();
    next(new UnauthorizedError('Cross-origin request rejected'));
  };
}
