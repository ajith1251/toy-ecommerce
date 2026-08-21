import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import PageLoader from './ui/PageLoader';

/**
 * Protects /admin routes. Requires an authenticated session AND the admin
 * role (the server enforces this too — this guard is UX, not security).
 * Non-admins land on a quiet "not authorized" state instead of the admin UI.
 */
export default function RequireAdmin({ children }: { children: ReactNode }) {
  const { status, user } = useAuth();
  const location = useLocation();

  if (status === 'loading') {
    return <PageLoader label="Checking your session…" />;
  }
  if (status === 'unauthenticated') {
    const returnTo = `${location.pathname}${location.search}`;
    return <Navigate to="/login" state={{ returnTo }} replace />;
  }
  if (user?.role !== 'admin') {
    return (
      <div className="pt-32 pb-24 text-center max-w-xl mx-auto px-6" role="alert">
        <div className="w-20 h-20 mx-auto rounded-full bg-red-50 dark:bg-red-900/20 flex items-center justify-center mb-5">
          <ShieldAlert size={40} className="text-red-400" aria-hidden />
        </div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Admin access required</h1>
        <p className="text-slate-500 dark:text-slate-400">
          You don't have permission to view this area.
        </p>
      </div>
    );
  }
  return <>{children}</>;
}
