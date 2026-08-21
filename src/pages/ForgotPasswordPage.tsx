import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { KeyRound, MailCheck } from 'lucide-react';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import { forgotPassword } from '../services/authService';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!EMAIL_RE.test(email.trim())) {
      setError('Enter a valid email address');
      return;
    }
    setSubmitting(true);
    try {
      // Always report the same outcome — never reveal whether the account
      // exists (the server responds identically either way).
      await forgotPassword(email.trim());
      setSent(true);
    } catch {
      setError('Could not request a reset right now — please try again later.');
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
              <KeyRound size={22} className="text-red-500" aria-hidden />
            </div>
            <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">Reset your password</h1>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
            Enter your email and we'll send you a link to choose a new password.
          </p>

          {sent ? (
            <div className="flex flex-col items-center text-center gap-3 py-6">
              <MailCheck size={40} className="text-green-500" aria-hidden />
              <p className="font-semibold text-slate-900 dark:text-white">Check your inbox</p>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                If an account exists for <span className="font-medium">{email}</span>, a password reset
                link is on its way. The link expires in 30 minutes.
              </p>
              <Link to="/login" className="text-sm font-semibold text-red-500 hover:underline mt-2">
                Back to log in
              </Link>
            </div>
          ) : (
            <>
              <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
                <Input
                  label="Email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  error={error ?? undefined}
                  required
                />
                <Button type="submit" size="lg" loading={submitting} className="w-full">
                  Send reset link
                </Button>
              </form>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-6 text-center">
                Remembered it?{' '}
                <Link to="/login" className="font-semibold text-red-500 hover:underline">
                  Log in
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
