import { beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '../lib/api/client';
import type { User } from '../types';
import type { AddressInput } from './authService';
import {
  changePassword,
  createAddress,
  deleteAddress,
  fetchMe,
  forgotPassword,
  listAddresses,
  login,
  logout,
  mergeGuestData,
  refreshSession,
  register,
  resetPassword,
  setDefaultAddress,
  updateAddress,
  updateProfile,
} from './authService';

vi.mock('../lib/api/client', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

const user: User = {
  id: 7,
  email: 'jane@example.com',
  firstName: 'Jane',
  lastName: 'Doe',
  phone: '555-0100',
  createdAt: '2026-01-02T00:00:00.000Z',
};

const address = {
  id: 3,
  label: 'Home',
  firstName: 'Jane',
  lastName: 'Doe',
  phone: '555-0100',
  line1: '1 Toy Lane',
  line2: '',
  city: 'Springfield',
  state: 'IL',
  postalCode: '62701',
  country: 'US',
  isDefault: true,
  createdAt: '2026-02-01T00:00:00.000Z',
};

const mocked = {
  get: vi.mocked(api.get),
  post: vi.mocked(api.post),
  patch: vi.mocked(api.patch),
  delete: vi.mocked(api.delete),
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('authService', () => {
  it('register posts credentials and returns the user', async () => {
    mocked.post.mockResolvedValue({ user });
    const result = await register({
      email: 'jane@example.com',
      password: 'Password123!',
      firstName: 'Jane',
      lastName: 'Doe',
    });
    expect(result).toEqual(user);
    expect(mocked.post).toHaveBeenCalledWith('/auth/register', {
      email: 'jane@example.com',
      password: 'Password123!',
      firstName: 'Jane',
      lastName: 'Doe',
    });
  });

  it('login posts email/password and returns the user', async () => {
    mocked.post.mockResolvedValue({ user });
    const result = await login('jane@example.com', 'Password123!');
    expect(result).toEqual(user);
    expect(mocked.post).toHaveBeenCalledWith('/auth/login', {
      email: 'jane@example.com',
      password: 'Password123!',
    });
  });

  it('logout posts to /auth/logout', async () => {
    mocked.post.mockResolvedValue({ ok: true });
    await logout();
    expect(mocked.post).toHaveBeenCalledWith('/auth/logout');
  });

  it('refreshSession posts to /auth/refresh', async () => {
    mocked.post.mockResolvedValue({ ok: true });
    await refreshSession();
    expect(mocked.post).toHaveBeenCalledWith('/auth/refresh');
  });

  it('fetchMe returns the user for an active session', async () => {
    mocked.get.mockResolvedValue({ user });
    expect(await fetchMe()).toEqual(user);
  });

  it('fetchMe returns null on 401 or network failure', async () => {
    mocked.get.mockRejectedValue(new Error('network'));
    expect(await fetchMe()).toBeNull();
  });

  it('mergeGuestData posts the guest cart and wishlist', async () => {
    const result = { cart: [{ productId: 1, quantity: 2 }], wishlist: [1], capped: [] };
    mocked.post.mockResolvedValue(result);
    await expect(mergeGuestData([{ productId: 1, quantity: 2 }], [1])).resolves.toEqual(result);
    expect(mocked.post).toHaveBeenCalledWith('/auth/merge', {
      cartItems: [{ productId: 1, quantity: 2 }],
      wishlistIds: [1],
    });
  });

  it('updateProfile patches the profile and returns the user', async () => {
    mocked.patch.mockResolvedValue({ user });
    await expect(updateProfile({ firstName: 'Janet' })).resolves.toEqual(user);
    expect(mocked.patch).toHaveBeenCalledWith('/account/profile', { firstName: 'Janet' });
  });

  it('changePassword patches /account/password', async () => {
    mocked.patch.mockResolvedValue({ ok: true });
    await changePassword('old-password', 'new-password');
    expect(mocked.patch).toHaveBeenCalledWith('/account/password', {
      currentPassword: 'old-password',
      newPassword: 'new-password',
    });
  });

  it('forgotPassword posts the email; the token goes out by email, never in the response', async () => {
    mocked.post.mockResolvedValue({ ok: true });
    await forgotPassword('jane@example.com');
    expect(mocked.post).toHaveBeenCalledWith('/auth/forgot-password', { email: 'jane@example.com' });
  });

  it('resetPassword posts the token and new password', async () => {
    mocked.post.mockResolvedValue({ ok: true });
    await resetPassword('token-abc', 'NewPassword123!');
    expect(mocked.post).toHaveBeenCalledWith('/auth/reset-password', {
      token: 'token-abc',
      password: 'NewPassword123!',
    });
  });

  it('listAddresses returns the addresses array', async () => {
    mocked.get.mockResolvedValue({ addresses: [address] });
    await expect(listAddresses()).resolves.toEqual([address]);
  });

  it('createAddress posts the input and returns the new address', async () => {
    mocked.post.mockResolvedValue({ address });
    const input: AddressInput = {
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
    };
    await expect(createAddress(input)).resolves.toEqual(address);
    expect(mocked.post).toHaveBeenCalledWith('/account/addresses', input);
  });

  it('updateAddress patches the address', async () => {
    mocked.patch.mockResolvedValue({ address });
    await expect(updateAddress(3, { city: 'Chicago' })).resolves.toEqual(address);
    expect(mocked.patch).toHaveBeenCalledWith('/account/addresses/3', { city: 'Chicago' });
  });

  it('deleteAddress deletes the address', async () => {
    mocked.delete.mockResolvedValue({ ok: true });
    await deleteAddress(3);
    expect(mocked.delete).toHaveBeenCalledWith('/account/addresses/3');
  });

  it('setDefaultAddress posts the default marker', async () => {
    mocked.post.mockResolvedValue({ ok: true });
    await setDefaultAddress(3);
    expect(mocked.post).toHaveBeenCalledWith('/account/addresses/3/default');
  });
});
