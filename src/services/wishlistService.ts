import { WISHLIST_STORAGE_KEY } from '../constants/storage';
import { storage } from '../lib/storage';
import { api } from '../lib/api/client';

/** Reads the persisted wishlist (product ids), keeping only numeric ids. */
export function loadWishlist(): number[] {
  const parsed = storage.get<unknown>(WISHLIST_STORAGE_KEY, []);
  return Array.isArray(parsed) ? parsed.filter((id): id is number => typeof id === 'number') : [];
}

/** Persists the wishlist. */
export function saveWishlist(ids: number[]): void {
  storage.set(WISHLIST_STORAGE_KEY, ids);
}

/** Toggles a product id in the list. Pure. */
export function toggleWishlistId(ids: number[], id: number): number[] {
  if (ids.includes(id)) return ids.filter(existing => existing !== id);
  return [...ids, id];
}

/** Removes a product id from the list. Pure. */
export function removeWishlistId(ids: number[], id: number): number[] {
  return ids.filter(existing => existing !== id);
}

/** Whether a product id is wishlisted. */
export function isWishlisted(ids: number[], id: number): boolean {
  return ids.includes(id);
}

// ── Server-backed wishlist (authenticated accounts) ────────────────────────

function toIds(products: Record<string, unknown>[]): number[] {
  return products.map(p => Number(p.id));
}

/** Loads the authenticated user's server wishlist (session-scoped). */
export async function loadServerWishlist(): Promise<number[]> {
  return toIds(await api.get<Record<string, unknown>[]>('/wishlist'));
}

export async function addServerWishlistItem(productId: number): Promise<number[]> {
  return toIds(await api.post<Record<string, unknown>[]>(`/wishlist/items/${productId}`));
}

export async function removeServerWishlistItem(productId: number): Promise<number[]> {
  return toIds(await api.delete<Record<string, unknown>[]>(`/wishlist/items/${productId}`));
}
