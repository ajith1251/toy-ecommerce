import { useState } from 'react';
import type { FormEvent } from 'react';
import { User, Mail, Phone, CalendarDays, Pencil, Check, X } from 'lucide-react';
import AccountNav from '../components/account/AccountNav';
import Breadcrumbs from '../components/ui/Breadcrumbs';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import { useAuth } from '../context/AuthContext';
import { useShop } from '../context/ShopContext';
import { isApiError } from '../lib/api/errors';
import { updateProfile } from '../services/authService';

export default function AccountPage() {
  const { user, refreshAuth } = useAuth();
  const { addToast } = useShop();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ firstName: user?.firstName ?? '', lastName: user?.lastName ?? '', phone: user?.phone ?? '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!user) return null;

  const startEdit = () => {
    setForm({ firstName: user.firstName, lastName: user.lastName, phone: user.phone });
    setError(null);
    setEditing(true);
  };

  const save = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await updateProfile({
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        phone: form.phone.trim(),
      });
      await refreshAuth();
      setEditing(false);
      addToast('Profile updated', 'success');
    } catch (err) {
      setError(isApiError(err) ? err.message : 'Could not update your profile');
    } finally {
      setSaving(false);
    }
  };

  const joined = new Date(user.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <div className="pt-24 pb-10">
      <div className="max-w-4xl mx-auto px-6 pt-4 flex flex-col gap-6">
        <Breadcrumbs items={[{ label: 'Account' }]} />
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-red-50 dark:bg-red-500/10 flex items-center justify-center">
            <User size={24} className="text-red-500" aria-hidden />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">
              Hi, {user.firstName || user.email.split('@')[0]}
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">Your account overview</p>
          </div>
        </div>

        <AccountNav />

        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Profile</h2>
            {!editing && (
              <Button variant="outline" size="sm" onClick={startEdit}>
                <Pencil size={14} aria-hidden /> Edit
              </Button>
            )}
          </div>

          {editing ? (
            <form onSubmit={save} className="flex flex-col gap-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input label="First name" name="firstName" value={form.firstName} onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))} />
                <Input label="Last name" name="lastName" value={form.lastName} onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))} />
              </div>
              <Input label="Phone" name="phone" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
              {error && <p role="alert" className="text-sm font-medium text-red-500">{error}</p>}
              <div className="flex gap-3">
                <Button type="submit" size="sm" loading={saving}>
                  <Check size={14} aria-hidden /> Save
                </Button>
                <Button type="button" variant="ghost" size="sm" onClick={() => setEditing(false)}>
                  <X size={14} aria-hidden /> Cancel
                </Button>
              </div>
            </form>
          ) : (
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
              <div className="flex items-center gap-3">
                <Mail size={18} className="text-slate-400" aria-hidden />
                <div>
                  <dt className="text-xs text-slate-400 uppercase tracking-wide">Email</dt>
                  <dd className="text-sm font-semibold text-slate-800 dark:text-slate-200">{user.email}</dd>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Phone size={18} className="text-slate-400" aria-hidden />
                <div>
                  <dt className="text-xs text-slate-400 uppercase tracking-wide">Phone</dt>
                  <dd className="text-sm font-semibold text-slate-800 dark:text-slate-200">{user.phone || '—'}</dd>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <User size={18} className="text-slate-400" aria-hidden />
                <div>
                  <dt className="text-xs text-slate-400 uppercase tracking-wide">Name</dt>
                  <dd className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                    {user.firstName} {user.lastName}
                  </dd>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <CalendarDays size={18} className="text-slate-400" aria-hidden />
                <div>
                  <dt className="text-xs text-slate-400 uppercase tracking-wide">Member since</dt>
                  <dd className="text-sm font-semibold text-slate-800 dark:text-slate-200">{joined}</dd>
                </div>
              </div>
            </dl>
          )}
        </div>
      </div>
    </div>
  );
}
