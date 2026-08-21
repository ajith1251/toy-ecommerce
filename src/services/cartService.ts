import { CART_STORAGE_KEY } from '../constants/storage';
import { storage } from '../lib/storage';
import { api } from '../lib/api/client';
import { mapProduct } from './productService';
import type { CartItem, Toy } from '../types';

/** Type guard for a single persisted cart item (must be a valid Toy + quantity). */
export function isCartItem(value: unknown): value is CartItem {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.id === 'number' &&
    typeof v.price === 'number' &&
    typeof v.quantity === 'number' &&
    v.quantity > 0
  );
}

/**
 * Reads the persisted cart, keeping only well-formed entries. A single
 * corrupted item never nukes the whole cart.
 */
export function loadCart(): CartItem[] {
  const parsed = storage.get<unknown>(CART_STORAGE_KEY, []);
  return Array.isArray(parsed) ? parsed.filter(isCartItem) : [];
}

/** Persists the cart. */
export function saveCart(items: CartItem[]): void {
  storage.set(CART_STORAGE_KEY, items);
}

/** Adds a toy (incrementing quantity if already present). Pure. */
export function addCartItem(items: CartItem[], toy: Toy): CartItem[] {
  const existing = items.find(i => i.id === toy.id);
  if (existing) {
    return items.map(i => (i.id === toy.id ? { ...i, quantity: i.quantity + 1 } : i));
  }
  return [...items, { ...toy, quantity: 1 }];
}

/** Removes a toy by id. Pure. */
export function removeCartItem(items: CartItem[], id: number): CartItem[] {
  return items.filter(i => i.id !== id);
}

/** Sets an item's quantity, removing it when the quantity drops to zero. Pure. */
export function updateCartQuantity(items: CartItem[], id: number, quantity: number): CartItem[] {
  if (quantity <= 0) return removeCartItem(items, id);
  return items.map(i => (i.id === id ? { ...i, quantity } : i));
}

/** Total unit count across all items. */
export function countCartItems(items: CartItem[]): number {
  return items.reduce((sum, i) => sum + i.quantity, 0);
}

/** Raw subtotal (price × quantity) — the pricing source is utils/orderCalculations. */
export function calcCartSubtotal(items: CartItem[]): number {
  return items.reduce((sum, i) => sum + i.price * i.quantity, 0);
}

// ── Server-backed cart (authenticated accounts) ────────────────────────────

interface ServerCartItem {
  productId: number;
  quantity: number;
  product: Record<string, unknown>;
}

function toCartItems(dtos: ServerCartItem[]): CartItem[] {
  return dtos.map(d => ({ ...mapProduct(d.product), quantity: d.quantity }));
}

/** Loads the authenticated user's server cart (ownership resolved by session). */
export async function loadServerCart(): Promise<CartItem[]> {
  return toCartItems(await api.get<ServerCartItem[]>('/cart'));
}

export async function addServerCartItem(productId: number, quantity: number): Promise<CartItem[]> {
  return toCartItems(await api.post<ServerCartItem[]>('/cart/items', { productId, quantity }));
}

export async function updateServerCartItem(productId: number, quantity: number): Promise<CartItem[]> {
  return toCartItems(await api.patch<ServerCartItem[]>(`/cart/items/${productId}`, { quantity }));
}

export async function removeServerCartItem(productId: number): Promise<CartItem[]> {
  return toCartItems(await api.delete<ServerCartItem[]>(`/cart/items/${productId}`));
}

export async function clearServerCart(): Promise<void> {
  await api.delete('/cart');
}
