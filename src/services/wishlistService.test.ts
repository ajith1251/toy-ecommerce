import { beforeEach, describe, expect, it } from 'vitest';
import { WISHLIST_STORAGE_KEY } from '../constants/storage';
import {
  isWishlisted,
  loadWishlist,
  removeWishlistId,
  saveWishlist,
  toggleWishlistId,
} from './wishlistService';

describe('wishlistService — pure operations', () => {
  it('toggles ids in and out', () => {
    expect(toggleWishlistId([], 1)).toEqual([1]);
    expect(toggleWishlistId([1], 1)).toEqual([]);
    expect(toggleWishlistId([1, 2], 3)).toEqual([1, 2, 3]);
  });

  it('removes an id', () => {
    expect(removeWishlistId([1, 2, 3], 2)).toEqual([1, 3]);
  });

  it('checks membership', () => {
    expect(isWishlisted([1, 2], 1)).toBe(true);
    expect(isWishlisted([1, 2], 9)).toBe(false);
  });
});

describe('wishlistService — persistence', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('round-trips the wishlist through localStorage', () => {
    saveWishlist([1, 2, 3]);
    expect(loadWishlist()).toEqual([1, 2, 3]);
  });

  it('returns an empty list for missing or malformed data', () => {
    expect(loadWishlist()).toEqual([]);
    localStorage.setItem(WISHLIST_STORAGE_KEY, '{oops');
    expect(loadWishlist()).toEqual([]);
  });

  it('keeps numeric ids and drops non-numeric entries', () => {
    localStorage.setItem(WISHLIST_STORAGE_KEY, JSON.stringify([1, 'two', 3, null]));
    expect(loadWishlist()).toEqual([1, 3]);
  });
});
