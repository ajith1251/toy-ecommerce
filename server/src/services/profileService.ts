import type { AddressRepository } from '../repositories/addressRepository.js';
import type { UserRepository } from '../repositories/userRepository.js';
import type { AddressInput, UpdateProfileInput } from '../schemas/auth.js';
import type { AddressDto, UserDto } from '../types.js';

export interface ProfileDeps {
  userRepo: UserRepository;
  addressRepo: AddressRepository;
}

export function createProfileService({ userRepo, addressRepo }: ProfileDeps) {
  // ── Profile ────────────────────────────────────────────────────────────
  async function getProfile(userId: number): Promise<UserDto | null> {
    return userRepo.findById(userId);
  }

  async function updateProfile(userId: number, input: UpdateProfileInput): Promise<UserDto | null> {
    return userRepo.updateProfile(userId, input);
  }

  // ── Addresses (ownership always from the authenticated session) ────────
  async function listAddresses(userId: number): Promise<AddressDto[]> {
    return addressRepo.listForUser(userId);
  }

  async function createAddress(userId: number, input: AddressInput): Promise<AddressDto> {
    return addressRepo.createForUser(userId, input);
  }

  async function updateAddress(userId: number, addressId: number, input: AddressInput): Promise<AddressDto | null> {
    return addressRepo.updateForUser(userId, addressId, input);
  }

  async function deleteAddress(userId: number, addressId: number): Promise<boolean> {
    return addressRepo.deleteForUser(userId, addressId);
  }

  async function setDefaultAddress(userId: number, addressId: number): Promise<boolean> {
    const existing = await addressRepo.getForUser(userId, addressId);
    if (!existing) return false;
    await addressRepo.setDefault(userId, addressId);
    return true;
  }

  return {
    getProfile,
    updateProfile,
    listAddresses,
    createAddress,
    updateAddress,
    deleteAddress,
    setDefaultAddress,
  };
}

export type ProfileService = ReturnType<typeof createProfileService>;
