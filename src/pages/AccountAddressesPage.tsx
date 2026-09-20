import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { MapPin, Plus, Pencil, Trash2, Check } from 'lucide-react';
import AccountNav from '../components/account/AccountNav';
import Breadcrumbs from '../components/ui/Breadcrumbs';
import Button from '../components/ui/Button';
import EmptyState from '../components/ui/EmptyState';
import Input from '../components/ui/Input';
import { useAuth } from '../context/AuthContext';
import { useShop } from '../context/ShopContext';
import { isApiError } from '../lib/api/errors';
import {
  createAddress,
  deleteAddress,
  listAddresses,
  setDefaultAddress,
  updateAddress,
  type AddressInput,
} from '../services/authService';
import type { Address } from '../types';

const EMPTY_FORM: AddressInput = {
  label: '',
  firstName: '',
  lastName: '',
  phone: '',
  line1: '',
  line2: '',
  city: '',
  state: '',
  postalCode: '',
  country: '',
};

export default function AccountAddressesPage() {
  const { user } = useAuth();
  const { addToast } = useShop();
  const [addresses, setAddresses] = useState<Address[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [editing, setEditing] = useState<Address | 'new' | null>(null);
  const [form, setForm] = useState<AddressInput>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    listAddresses()
      .then(list => {
        if (cancelled) return;
        setAddresses(list);
        setLoadError(null);
      })
      .catch(() => {
        if (!cancelled) setLoadError('Unable to load your addresses — please try again.');
      });
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  const load = () => {
    setAddresses(null);
    setLoadError(null);
    setReloadKey(key => key + 1);
  };

  const openNew = () => {
    setForm({ ...EMPTY_FORM, firstName: user?.firstName ?? '', lastName: user?.lastName ?? '', phone: user?.phone ?? '' });
    setError(null);
    setEditing('new');
  };

  const openEdit = (address: Address) => {
    setForm({
      label: address.label,
      firstName: address.firstName,
      lastName: address.lastName,
      phone: address.phone,
      line1: address.line1,
      line2: address.line2,
      city: address.city,
      state: address.state,
      postalCode: address.postalCode,
      country: address.country,
    });
    setError(null);
    setEditing(address);
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      if (editing === 'new') {
        await createAddress(form);
        addToast('Address added', 'success');
      } else if (editing) {
        await updateAddress(editing.id, form);
        addToast('Address updated', 'success');
      }
      setEditing(null);
      await load();
    } catch (err) {
      setError(isApiError(err) ? err.message : 'Could not save this address');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: number) => {
    try {
      await deleteAddress(id);
      addToast('Address removed', 'info');
      await load();
    } catch {
      addToast('Could not remove this address', 'error');
    }
  };

  const setDefault = async (id: number) => {
    try {
      await setDefaultAddress(id);
      await load();
    } catch {
      addToast('Could not update your default address', 'error');
    }
  };

  return (
    <div className="pt-24 pb-10">
      <div className="max-w-4xl mx-auto px-6 pt-4 flex flex-col gap-8">
        <Breadcrumbs items={[{ label: 'Account', to: '/account' }, { label: 'Addresses' }]} />
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-[var(--radius-button,8px)] bg-[var(--accent-coral)]/10 flex items-center justify-center border border-[var(--accent-coral)]/20">
            <MapPin size={32} className="text-[var(--accent-coral)]" aria-hidden />
          </div>
          <div className="flex-1">
            <h1 className="text-3xl font-extrabold text-[var(--ink-strong)]">Addresses</h1>
            <p className="text-sm font-semibold text-[var(--muted-light)] mt-1">Saved shipping addresses for faster checkout.</p>
          </div>
          <Button onClick={openNew}>
            <Plus size={16} aria-hidden className="mr-2" /> Add Address
          </Button>
        </div>

        <AccountNav />

        {loadError ? (
          <div className="text-center py-16">
            <p className="text-[var(--muted)] font-medium mb-4">{loadError}</p>
            <Button variant="outline" onClick={load}>Try Again</Button>
          </div>
        ) : addresses === null ? (
          <p className="text-[var(--muted-light)] font-bold text-center py-16">Loading your addresses…</p>
        ) : addresses.length === 0 && editing === null ? (
          <EmptyState
            icon={<MapPin size={64} />}
            title="No saved addresses yet"
            description="Add an address and pick it during checkout."
            actions={<Button onClick={openNew}><Plus size={16} aria-hidden className="mr-2" /> Add an address</Button>}
          />
        ) : (
          <div className="flex flex-col gap-6">
            {addresses.map(address => (
              <div
                key={address.id}
                className="bg-[var(--surface)] rounded-[var(--radius-card,16px)] border border-[var(--hairline)] shadow-sm p-6 flex flex-col sm:flex-row sm:items-center gap-6"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-lg font-extrabold text-[var(--ink-strong)]">{address.label || 'Address'}</span>
                    {address.isDefault && (
                      <span className="text-[10px] font-bold uppercase tracking-widest bg-[var(--surface-soft)] text-[var(--accent-green)] border border-[var(--accent-green)] px-3 py-1 rounded-full">
                        Default
                      </span>
                    )}
                  </div>
                  <p className="text-sm font-bold text-[var(--ink)] mb-1">
                    {address.firstName} {address.lastName}
                  </p>
                  <p className="text-sm font-medium text-[var(--muted)]">
                    {address.line1}
                    {address.line2 ? `, ${address.line2}` : ''}, {address.city}
                    {address.state ? `, ${address.state}` : ''} {address.postalCode}, {address.country}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {!address.isDefault && (
                    <Button variant="ghost" size="sm" onClick={() => setDefault(address.id)}>
                      <Check size={16} aria-hidden className="mr-1.5" /> Set default
                    </Button>
                  )}
                  <Button variant="ghost" size="sm" onClick={() => openEdit(address)} aria-label={`Edit ${address.label || 'address'}`}>
                    <Pencil size={16} aria-hidden className="mr-1.5" /> Edit
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => remove(address.id)} aria-label={`Delete ${address.label || 'address'}`}>
                    <Trash2 size={16} aria-hidden />
                  </Button>
                </div>
              </div>
            ))}

            {editing && (
              <form onSubmit={submit} className="bg-[var(--surface)] rounded-[var(--radius-card,16px)] border border-[var(--hairline)] shadow-sm p-8 flex flex-col gap-6">
                <h2 className="text-xl font-extrabold text-[var(--ink-strong)] border-b border-[var(--hairline)] pb-4">
                  {editing === 'new' ? 'New address' : 'Edit address'}
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <Input label="Label" name="label" value={form.label} onChange={e => setForm(f => ({ ...f, label: e.target.value }))} placeholder="Home, Work…" />
                  <Input label="Phone" name="phone" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
                  <Input label="First name" name="firstName" value={form.firstName} onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))} />
                  <Input label="Last name" name="lastName" value={form.lastName} onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))} />
                  <div className="sm:col-span-2">
                    <Input label="Street address" name="line1" value={form.line1} onChange={e => setForm(f => ({ ...f, line1: e.target.value }))} required />
                  </div>
                  <Input label="Apartment / suite (optional)" name="line2" value={form.line2} onChange={e => setForm(f => ({ ...f, line2: e.target.value }))} />
                  <Input label="City" name="city" value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} required />
                  <Input label="State / province" name="state" value={form.state} onChange={e => setForm(f => ({ ...f, state: e.target.value }))} />
                  <Input label="Postal code" name="postalCode" value={form.postalCode} onChange={e => setForm(f => ({ ...f, postalCode: e.target.value }))} required />
                  <Input label="Country" name="country" value={form.country} onChange={e => setForm(f => ({ ...f, country: e.target.value }))} required />
                </div>
                {error && <p role="alert" className="text-sm font-bold text-[var(--accent-coral)] bg-[var(--accent-coral)]/10 px-4 py-3 rounded-[8px]">{error}</p>}
                <div className="flex gap-4">
                  <Button type="submit" loading={saving}>Save Address</Button>
                  <Button type="button" variant="ghost" onClick={() => setEditing(null)}>Cancel</Button>
                </div>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
