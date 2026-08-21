import { ANON_ID_STORAGE_KEY } from '../constants/storage';
import { storage } from './storage';

const CLIENT_ID_PATTERN = /^[A-Za-z0-9-]{8,128}$/;

function generateId(): string {
  const cryptoApi = globalThis.crypto;
  if (cryptoApi?.randomUUID) return cryptoApi.randomUUID();
  // Fallback for environments without crypto.randomUUID (deterministic-ish).
  return `anon-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 14)}`;
}

/**
 * Returns (and lazily creates) the anonymous client id for this browser.
 * Used only to scope server-owned carts/wishlists/orders to a single
 * browser — it is NOT authentication (see docs/api.md).
 */
export function getClientId(): string {
  const existing = storage.get<string | null>(ANON_ID_STORAGE_KEY, null);
  if (existing && CLIENT_ID_PATTERN.test(existing)) return existing;
  const id = generateId();
  storage.set(ANON_ID_STORAGE_KEY, id);
  return id;
}
