import { createContext, useContext } from 'react';
import type { User } from '../types';

export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

export interface RegisterPayload {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
}

export interface AuthContextValue {
  status: AuthStatus;
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  logout: () => Promise<void>;
  /** Re-checks /api/auth/me (e.g. after session refresh or expiry). */
  refreshAuth: () => Promise<void>;
}

/**
 * Guest-safe default: components can call useAuth() outside an AuthProvider
 * (tests, isolated renders) and get an unauthenticated, no-op session.
 */
export const DEFAULT_AUTH: AuthContextValue = {
  status: 'unauthenticated',
  user: null,
  login: async () => {},
  register: async () => {},
  logout: async () => {},
  refreshAuth: async () => {},
};

export const AuthContext = createContext<AuthContextValue>(DEFAULT_AUTH);

export function useAuth(): AuthContextValue {
  return useContext(AuthContext);
}
