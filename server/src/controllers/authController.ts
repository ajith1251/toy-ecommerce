import type { Response } from 'express';
import type { ServerConfig } from '../config.js';
import type { MergeInput, RegisterInput } from '../schemas/auth.js';
import type { AuthService } from '../services/authService.js';
import type { SessionUser } from '../types.js';

export interface AuthControllerDeps {
  auth: AuthService;
  config: Pick<ServerConfig, 'auth'>;
}

function sessionCookie(token: string, config: AuthControllerDeps['config'], maxAgeMs: number): string {
  const secure = config.auth.cookieSecure ? '; Secure' : '';
  return `${config.auth.cookieName}=${token}; Path=/; HttpOnly; SameSite=Lax${secure}; Max-Age=${Math.floor(maxAgeMs / 1000)}`;
}

function clearCookie(config: AuthControllerDeps['config']): string {
  return `${config.auth.cookieName}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}

export function createAuthController({ auth, config }: AuthControllerDeps) {
  function setSession(res: Response, token: string) {
    res.setHeader('Set-Cookie', sessionCookie(token, config, config.auth.sessionTtlMs));
  }

  async function register(body: RegisterInput, res: Response) {
    const { user, token } = await auth.register(body);
    setSession(res, token);
    res.status(201).json({ data: { user } });
  }

  async function login(body: { email: string; password: string }, res: Response) {
    const { user, token } = await auth.login(body.email, body.password);
    setSession(res, token);
    res.json({ data: { user } });
  }

  async function logout(user: SessionUser, res: Response) {
    await auth.logout(user.sessionId);
    res.setHeader('Set-Cookie', clearCookie(config));
    res.json({ data: { ok: true } });
  }

  async function logoutAll(user: SessionUser, res: Response) {
    await auth.logoutAll(user.userId);
    res.setHeader('Set-Cookie', clearCookie(config));
    res.json({ data: { ok: true } });
  }

  async function refresh(user: SessionUser, res: Response) {
    const { token } = await auth.refresh(user);
    setSession(res, token);
    res.json({ data: { ok: true } });
  }

  async function me(user: SessionUser, res: Response) {
    const profile = await auth.getMe(user.userId);
    if (!profile) {
      res.setHeader('Set-Cookie', clearCookie(config));
      res.status(401).json({ error: { code: 'unauthorized', message: 'Authentication required' } });
      return;
    }
    res.json({ data: { user: profile } });
  }

  async function merge(user: SessionUser, clientId: string, body: MergeInput, res: Response) {
    const result = await auth.merge(user.userId, clientId, body);
    res.json({ data: result });
  }

  async function changePassword(user: SessionUser, body: { currentPassword: string; newPassword: string }, res: Response) {
    await auth.changePassword(user.userId, user.sessionId, body.currentPassword, body.newPassword);
    res.json({ data: { ok: true } });
  }

  /** Generic response for both existing and unknown emails — no enumeration,
   *  and the one-time token is never returned (it goes out by email only). */
  async function forgotPassword(body: { email: string }, res: Response) {
    await auth.forgotPassword(body.email);
    res.json({ data: { ok: true } });
  }

  async function resetPassword(body: { token: string; password: string }, res: Response) {
    await auth.resetPassword(body.token, body.password);
    res.json({ data: { ok: true } });
  }

  return { register, login, logout, logoutAll, refresh, me, merge, changePassword, forgotPassword, resetPassword };
}

export type AuthController = ReturnType<typeof createAuthController>;
