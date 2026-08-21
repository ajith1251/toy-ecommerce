import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import { isApiError } from '../lib/api/errors';
import { resetPassword } from '../services/authService';

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError(null);
    const fieldErrors: Record<string, string> = {};
    if (password.length < 8) fieldErrors.password = 'Password must be at least 8 characters';
    if (confirm !== password) fieldErrors.confirm = 'Passwords do not match';
    setErrors(fieldErrors);
    if (Object.keys(fieldErrors).length > 0) return;

    setSubmitting(true);
    try {
      await resetPassword(token, password);
      setDone(true);
    } catch (err) {
      setFormError(
        isApiError(err) ? err.message : 'This reset link could not be used — please request a new one.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <div className="pt-24 pb-16 min-h-[70vh] flex items-center justify-center">
        <div className="w-full max-w-md px-6">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-xl p-8 text-center">
            <ShieldCheck size={40} className="mx-auto text-green-500 mb-3" aria-hidden />
            <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white mb-2">Password updated</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
              Your password has been changed and your other sessions were signed out.
            </p>
            <Link to="/login">
              <Button>Log in with your new password</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="pt-24 pb-16 min-h-[70vh] flex items-center justify-center">
      <div className="w-full max-w-md px-6">
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-xl p-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-11 h-11 rounded-2xl bg-red-50 dark:bg-red-500/10 flex items-center justify-center">
              <ShieldCheck size={22} className="text-red-500" aria-hidden />
            </div>
            <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">Choose a new password</h1>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
            {token ? 'Enter your new password below.' : 'This reset link is missing its token — please use the link from your email.'}
          </p>

          {!token ? (
            <Link to="/forgot-password" className="text-sm font-semibold text-red-500 hover:underline">
              Request a new reset link
            </Link>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
              <Input
                label="New password"
                name="newPassword"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                error={errors.password}
                hint="At least 8 characters"
                required
              />
              <Input
                label="Confirm new password"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                error={errors.confirm}
                required
              />
              {formError && <p role="alert" className="text-sm font-medium text-red-500">{formError}</p>}
              <Button type="submit" size="lg" loading={submitting} className="w-full">
                Update password
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
