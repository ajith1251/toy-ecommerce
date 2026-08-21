import { RECENT_STORAGE_KEY } from '../constants/storage';
import { storage } from '../lib/storage';

/** Maximum number of recently-viewed product ids kept. Centralized. */
export const MAX_RECENT_IDS = 5;

/** Reads the persisted recently-viewed ids, keeping only numeric ids. */
export function loadRecentIds(): number[] {
  const parsed = storage.get<unknown>(RECENT_STORAGE_KEY, []);
  return Array.isArray(parsed) ? parsed.filter((id): id is number => typeof id === 'number') : [];
}

/**
 * Records a product view. Deterministic dedupe: the id moves to the front
 * (newest first) and the list is capped at MAX_RECENT_IDS. Persists and
 * returns the updated list.
 */
export function addRecentId(id: number): number[] {
  const current = loadRecentIds();
  const deduped = current.filter(existing => existing !== id);
  const updated = [id, ...deduped].slice(0, MAX_RECENT_IDS);
  storage.set(RECENT_STORAGE_KEY, updated);
  return updated;
}
