import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { LogIn } from 'lucide-react';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import { useAuth } from '../context/AuthContext';
import { isApiError } from '../lib/api/errors';

interface LocationState {
  returnTo?: string;
}

export default function LoginPage() {
  const { status, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const returnTo = (location.state as LocationState | null)?.returnTo ?? '/account';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Already authenticated (e.g. logged in elsewhere) — go to the account.
  if (status === 'authenticated') {
    return <Navigate to={returnTo} replace />;
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(email, password);
      navigate(returnTo, { replace: true });
    } catch (err) {
      setError(
        isApiError(err)
          ? err.message
          : 'Unable to log in — please check your connection and try again.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="pt-24 pb-16 min-h-[70vh] flex items-center justify-center">
      <div className="w-full max-w-md px-6">
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-xl p-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-11 h-11 rounded-2xl bg-red-50 dark:bg-red-500/10 flex items-center justify-center">
              <LogIn size={22} className="text-red-500" aria-hidden />
            </div>
            <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">Welcome back</h1>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
            Log in to see your cart, wishlist, addresses and orders.
          </p>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
            <Input
              label="Email"
              name="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
            />
            {error && (
              <p role="alert" className="text-sm font-medium text-red-500 bg-red-50 dark:bg-red-500/10 rounded-xl px-4 py-3">
                {error}
              </p>
            )}

            <div className="flex items-center justify-between">
              <Input
                label="Password"
                name="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                className="flex-1"
                required
              />
              <Link
                to="/forgot-password"
                className="ml-3 mt-6 text-xs font-semibold text-red-500 hover:underline whitespace-nowrap"
              >
                Forgot password?
              </Link>
            </div>

            <Button type="submit" size="lg" loading={submitting} className="w-full">
              Log In
            </Button>
          </form>

          <p className="text-sm text-slate-500 dark:text-slate-400 mt-6 text-center">
            New to ToyBox?{' '}
            <Link to="/register" state={{ returnTo }} className="font-semibold text-red-500 hover:underline">
              Create an account
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
