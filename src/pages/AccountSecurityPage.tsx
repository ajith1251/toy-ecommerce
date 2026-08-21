import { useState } from 'react';
import type { FormEvent } from 'react';
import { ShieldCheck, KeyRound, LogOut, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import AccountNav from '../components/account/AccountNav';
import Breadcrumbs from '../components/ui/Breadcrumbs';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import { useAuth } from '../context/AuthContext';
import { useShop } from '../context/ShopContext';
import { isApiError } from '../lib/api/errors';
import { changePassword } from '../services/authService';

export default function AccountSecurityPage() {
  const { logout } = useAuth();
  const { addToast } = useShop();
  const navigate = useNavigate();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [loggingOutAll, setLoggingOutAll] = useState(false);

  const handleChangePassword = async (e: FormEvent) => {
    e.preventDefault();
    setFormError(null);
    const fieldErrors: Record<string, string> = {};
    if (newPassword.length < 8) fieldErrors.newPassword = 'Password must be at least 8 characters';
    if (confirm !== newPassword) fieldErrors.confirm = 'Passwords do not match';
    setErrors(fieldErrors);
    if (Object.keys(fieldErrors).length > 0) return;

    setSaving(true);
    try {
      await changePassword(currentPassword, newPassword);
      setCurrentPassword('');
      setNewPassword('');
      setConfirm('');
      addToast('Password changed — other sessions were signed out', 'success');
    } catch (err) {
      setFormError(isApiError(err) ? err.message : 'Could not change your password');
    } finally {
      setSaving(false);
    }
  };

  const handleLogoutAll = async () => {
    setLoggingOutAll(true);
    try {
      // Leave the protected route before the session flips so RequireAuth
      // can't race us to /login.
      navigate('/');
      await logout();
      addToast('Signed out everywhere', 'info');
    } finally {
      setLoggingOutAll(false);
    }
  };

  return (
    <div className="pt-24 pb-10">
      <div className="max-w-4xl mx-auto px-6 pt-4 flex flex-col gap-6">
        <Breadcrumbs items={[{ label: 'Account', to: '/account' }, { label: 'Security' }]} />
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-red-50 dark:bg-red-500/10 flex items-center justify-center">
            <ShieldCheck size={24} className="text-red-500" aria-hidden />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">Security</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">Change your password and manage sessions.</p>
          </div>
        </div>

        <AccountNav />

        <form onSubmit={handleChangePassword} className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm p-6 flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <KeyRound size={18} className="text-slate-400" aria-hidden />
            <h2 className="font-bold text-slate-900 dark:text-white">Change password</h2>
          </div>
          <Input
            label="Current password"
            name="currentPassword"
            type="password"
            autoComplete="current-password"
            value={currentPassword}
            onChange={e => setCurrentPassword(e.target.value)}
            required
          />
          <Input
            label="New password"
            name="newPassword"
            type="password"
            autoComplete="new-password"
            value={newPassword}
            onChange={e => setNewPassword(e.target.value)}
            error={errors.newPassword}
            hint="At least 8 characters. Changing it signs you out on other devices."
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
          <div>
            <Button type="submit" loading={saving}>Update password</Button>
          </div>
        </form>

        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm p-6 flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <RefreshCw size={18} className="text-slate-400" aria-hidden />
            <h2 className="font-bold text-slate-900 dark:text-white">Sessions</h2>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Sign out of this browser, or every device at once.
          </p>
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => {
                navigate('/');
                void logout();
              }}
            >
              <LogOut size={14} aria-hidden /> Log out
            </Button>
            <Button variant="danger" onClick={handleLogoutAll} loading={loggingOutAll}>
              <LogOut size={14} aria-hidden /> Log out everywhere
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
