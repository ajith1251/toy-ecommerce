import { api } from '../lib/api/client';
import type { Address, User } from '../types';

/** Frontend mirror of the server's auth/profile endpoints. Sessions ride the
 *  HttpOnly cookie — no tokens are ever stored client-side. */
export interface RegisterPayload {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
}

export interface MergeResult {
  cart: { productId: number; quantity: number }[];
  wishlist: number[];
  capped: { productId: number; requested: number; capped: number }[];
}

export async function register(payload: RegisterPayload): Promise<User> {
  const res = await api.post<{ user: User }>('/auth/register', payload);
  return res.user;
}

export async function login(email: string, password: string): Promise<User> {
  const res = await api.post<{ user: User }>('/auth/login', { email, password });
  return res.user;
}

export async function logout(): Promise<void> {
  await api.post<{ ok: boolean }>('/auth/logout');
}

export async function refreshSession(): Promise<void> {
  await api.post<{ ok: boolean }>('/auth/refresh');
}

export async function fetchMe(): Promise<User | null> {
  try {
    const res = await api.get<{ user: User }>('/auth/me');
    return res.user;
  } catch {
    return null; // 401 (or network) ⇒ unauthenticated
  }
}

/** Merges the guest cart/wishlist into the account after login/register. */
export async function mergeGuestData(
  cartItems: { productId: number; quantity: number }[],
  wishlistIds: number[]
): Promise<MergeResult> {
  return api.post<MergeResult>('/auth/merge', { cartItems, wishlistIds });
}

export async function updateProfile(patch: { firstName?: string; lastName?: string; phone?: string }): Promise<User> {
  const res = await api.patch<{ user: User }>('/account/profile', patch);
  return res.user;
}

export async function changePassword(currentPassword: string, newPassword: string): Promise<void> {
  await api.patch<{ ok: boolean }>('/account/password', { currentPassword, newPassword });
}

/**
 * Requests a password-reset email. The server sends the one-time link by
 * email and intentionally responds identically whether or not the account
 * exists (no account enumeration) — the response never contains a token.
 */
export async function forgotPassword(email: string): Promise<void> {
  await api.post<{ ok: boolean }>('/auth/forgot-password', { email });
}

export async function resetPassword(token: string, password: string): Promise<void> {
  await api.post<{ ok: boolean }>('/auth/reset-password', { token, password });
}

// ── Addresses ────────────────────────────────────────────────────────────

export async function listAddresses(): Promise<Address[]> {
  const res = await api.get<{ addresses: Address[] }>('/account/addresses');
  return res.addresses;
}

export type AddressInput = Omit<Address, 'id' | 'isDefault' | 'createdAt'>;

export async function createAddress(input: AddressInput): Promise<Address> {
  const res = await api.post<{ address: Address }>('/account/addresses', input);
  return res.address;
}

export async function updateAddress(id: number, input: Partial<AddressInput>): Promise<Address> {
  const res = await api.patch<{ address: Address }>(`/account/addresses/${id}`, input);
  return res.address;
}

export async function deleteAddress(id: number): Promise<void> {
  await api.delete<{ ok: boolean }>(`/account/addresses/${id}`);
}

export async function setDefaultAddress(id: number): Promise<void> {
  await api.post<{ ok: boolean }>(`/account/addresses/${id}/default`);
}
