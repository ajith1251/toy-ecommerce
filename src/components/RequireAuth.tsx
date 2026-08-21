import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import PageLoader from './ui/PageLoader';

/**
 * Protects account routes. While the session is still being checked a loader
 * is shown (no protected-content flash); unauthenticated users are sent to
 * /login with a `returnTo` so login can bring them back.
 */
export default function RequireAuth({ children }: { children: ReactNode }) {
  const { status } = useAuth();
  const location = useLocation();

  if (status === 'loading') {
    return <PageLoader label="Checking your session…" />;
  }
  if (status === 'unauthenticated') {
    const returnTo = `${location.pathname}${location.search}`;
    return <Navigate to="/login" state={{ returnTo }} replace />;
  }
  return <>{children}</>;
}
