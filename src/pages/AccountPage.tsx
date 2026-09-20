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
      <div className="max-w-4xl mx-auto px-6 pt-4 flex flex-col gap-8">
        <Breadcrumbs items={[{ label: 'Account' }]} />
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-[var(--radius-button,8px)] bg-[var(--accent-coral)]/10 flex items-center justify-center border border-[var(--accent-coral)]/20">
            <User size={32} className="text-[var(--accent-coral)]" aria-hidden />
          </div>
          <div>
            <h1 className="text-3xl font-extrabold text-[var(--ink-strong)]">
              Hi, {user.firstName || user.email.split('@')[0]}
            </h1>
            <p className="text-sm font-semibold text-[var(--muted-light)] mt-1">Your account overview</p>
          </div>
        </div>

        <AccountNav />

        <div className="bg-[var(--surface)] rounded-[var(--radius-card,16px)] border border-[var(--hairline)] shadow-sm p-8">
          <div className="flex items-center justify-between mb-6 border-b border-[var(--hairline)] pb-4">
            <h2 className="text-xl font-extrabold text-[var(--ink-strong)]">Profile</h2>
            {!editing && (
              <Button variant="outline" size="sm" onClick={startEdit}>
                <Pencil size={14} aria-hidden className="mr-1.5" /> Edit
              </Button>
            )}
          </div>

          {editing ? (
            <form onSubmit={save} className="flex flex-col gap-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <Input label="First name" name="firstName" value={form.firstName} onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))} />
                <Input label="Last name" name="lastName" value={form.lastName} onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))} />
              </div>
              <Input label="Phone" name="phone" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
              {error && <p role="alert" className="text-sm font-bold text-[var(--accent-coral)] bg-[var(--accent-coral)]/10 px-4 py-3 rounded-[8px]">{error}</p>}
              <div className="flex gap-4">
                <Button type="submit" loading={saving}>
                  <Check size={16} aria-hidden className="mr-2" /> Save Changes
                </Button>
                <Button type="button" variant="ghost" onClick={() => setEditing(false)}>
                  <X size={16} aria-hidden className="mr-2" /> Cancel
                </Button>
              </div>
            </form>
          ) : (
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-6">
              <div className="flex items-start gap-4">
                <div className="mt-1">
                  <Mail size={20} className="text-[var(--accent-blue)]" aria-hidden />
                </div>
                <div>
                  <dt className="text-[10px] font-bold text-[var(--accent-blue)] uppercase tracking-widest mb-1">Email</dt>
                  <dd className="text-sm font-bold text-[var(--ink-strong)]">{user.email}</dd>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="mt-1">
                  <Phone size={20} className="text-[var(--accent-green)]" aria-hidden />
                </div>
                <div>
                  <dt className="text-[10px] font-bold text-[var(--accent-green)] uppercase tracking-widest mb-1">Phone</dt>
                  <dd className="text-sm font-bold text-[var(--ink-strong)]">{user.phone || '—'}</dd>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="mt-1">
                  <User size={20} className="text-[var(--accent-yellow)]" aria-hidden />
                </div>
                <div>
                  <dt className="text-[10px] font-bold text-[var(--accent-yellow)] uppercase tracking-widest mb-1">Name</dt>
                  <dd className="text-sm font-bold text-[var(--ink-strong)]">
                    {user.firstName} {user.lastName}
                  </dd>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="mt-1">
                  <CalendarDays size={20} className="text-[var(--accent-coral)]" aria-hidden />
                </div>
                <div>
                  <dt className="text-[10px] font-bold text-[var(--accent-coral)] uppercase tracking-widest mb-1">Member since</dt>
                  <dd className="text-sm font-bold text-[var(--ink-strong)]">{joined}</dd>
                </div>
              </div>
            </dl>
          )}
        </div>
      </div>
    </div>
  );
}
