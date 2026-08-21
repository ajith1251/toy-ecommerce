import { useState, useCallback, useEffect } from 'react';
import type { Toy } from '../types';
import { isWishlisted, loadWishlist, saveWishlist, toggleWishlistId } from '../services/wishlistService';

/**
 * Wishlist state hook. Mutations and persistence delegate to wishlistService.
 *
 *   UI → useWishlist → wishlistService → localStorage (guest) / server (account)
 *
 * In `serverMode` the ids are reconciled with the server wishlist; on logout
 * the hook rehydrates the anonymous localStorage list.
 */
export function useWishlist(serverMode = false) {
  const [ids, setIds] = useState<number[]>(loadWishlist);

  useEffect(() => {
    if (!serverMode) saveWishlist(ids);
  }, [ids, serverMode]);

  // Back to guest mode (logout): rehydrate the anonymous localStorage list.
  const [prevMode, setPrevMode] = useState(serverMode);
  if (prevMode !== serverMode) {
    setPrevMode(serverMode);
    if (!serverMode) setIds(loadWishlist());
  }

  const toggleItem = useCallback((toy: Toy) => {
    setIds(prev => toggleWishlistId(prev, toy.id));
  }, []);

  const replace = useCallback((next: number[]) => setIds(next), []);

  const isInWishlist = useCallback((id: number) => isWishlisted(ids, id), [ids]);

  return { ids, toggleItem, replace, isInWishlist, count: ids.length };
}
