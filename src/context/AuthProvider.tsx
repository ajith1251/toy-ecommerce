import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import * as authService from '../services/authService';
import type { User } from '../types';
import { AuthContext, type AuthContextValue, type AuthStatus, type RegisterPayload } from './AuthContext';

/**
 * Owns the authentication session. On boot it checks GET /api/auth/me (the
 * HttpOnly session cookie does the talking — no tokens in localStorage).
 * Auth state drives route guards and the guest → account cart migration.
 */
export default function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    let cancelled = false;
    authService
      .fetchMe()
      .then(me => {
        if (cancelled) return;
        setUser(me);
        setStatus(me ? 'authenticated' : 'unauthenticated');
      })
      .catch(() => {
        if (cancelled) return;
        setStatus('unauthenticated');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const refreshAuth = useCallback(async () => {
    try {
      const me = await authService.fetchMe();
      setUser(me);
      setStatus(me ? 'authenticated' : 'unauthenticated');
    } catch {
      setUser(null);
      setStatus('unauthenticated');
    }
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const me = await authService.login(email, password);
    setUser(me);
    setStatus('authenticated');
  }, []);

  const register = useCallback(async (payload: RegisterPayload) => {
    const me = await authService.register(payload);
    setUser(me);
    setStatus('authenticated');
  }, []);

  const logout = useCallback(async () => {
    try {
      await authService.logout();
    } catch {
      // Ignore network failures — local session state is cleared below regardless.
    }
    // Clear local session state regardless of network outcome.
    setUser(null);
    setStatus('unauthenticated');
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ status, user, login, register, logout, refreshAuth }),
    [status, user, login, register, logout, refreshAuth]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
