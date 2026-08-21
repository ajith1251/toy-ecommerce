import type { Response } from 'express';
import { NotFoundError } from '../errors.js';
import type { AddressInput, UpdateProfileInput } from '../schemas/auth.js';
import type { ProfileService } from '../services/profileService.js';

export interface ProfileControllerDeps {
  profile: ProfileService;
}

export function createProfileController({ profile }: ProfileControllerDeps) {
  async function getProfile(userId: number, res: Response) {
    const user = await profile.getProfile(userId);
    if (!user) throw new NotFoundError('Account not found');
    res.json({ data: { user } });
  }

  async function updateProfile(userId: number, body: UpdateProfileInput, res: Response) {
    const user = await profile.updateProfile(userId, body);
    if (!user) throw new NotFoundError('Account not found');
    res.json({ data: { user } });
  }

  async function listAddresses(userId: number, res: Response) {
    res.json({ data: { addresses: await profile.listAddresses(userId) } });
  }

  async function createAddress(userId: number, body: AddressInput, res: Response) {
    const address = await profile.createAddress(userId, body);
    res.status(201).json({ data: { address } });
  }

  async function updateAddress(userId: number, addressId: number, body: AddressInput, res: Response) {
    const address = await profile.updateAddress(userId, addressId, body);
    if (!address) throw new NotFoundError('Address not found');
    res.json({ data: { address } });
  }

  async function deleteAddress(userId: number, addressId: number, res: Response) {
    const deleted = await profile.deleteAddress(userId, addressId);
    if (!deleted) throw new NotFoundError('Address not found');
    res.json({ data: { ok: true } });
  }

  async function setDefaultAddress(userId: number, addressId: number, res: Response) {
    const ok = await profile.setDefaultAddress(userId, addressId);
    if (!ok) throw new NotFoundError('Address not found');
    res.json({ data: { ok: true } });
  }

  return { getProfile, updateProfile, listAddresses, createAddress, updateAddress, deleteAddress, setDefaultAddress };
}

export type ProfileController = ReturnType<typeof createProfileController>;
