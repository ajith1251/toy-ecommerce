import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { useCart } from '../hooks/useCart';
import { useFilters } from '../hooks/useFilters';
import { useTheme } from '../hooks/useTheme';
import { useToast } from '../hooks/useToast';
import { useWishlist } from '../hooks/useWishlist';
import {
  addServerCartItem,
  clearServerCart,
  loadServerCart,
  removeServerCartItem,
  saveCart,
  updateServerCartItem,
} from '../services/cartService';
import {
  addServerWishlistItem,
  loadServerWishlist,
  removeServerWishlistItem,
  saveWishlist,
} from '../services/wishlistService';
import { mergeGuestData } from '../services/authService';
import { CART_STORAGE_KEY, WISHLIST_STORAGE_KEY } from '../constants/storage';
import { addRecentId, loadRecentIds } from '../services/recentService';
import { getProductById } from '../services/productService';
import type { CartItem, Order, Toy } from '../types';
import { ShopContext } from './ShopContext';
import type { ShopContextValue } from './ShopContext';

export default function ShopProvider({ children }: { children: ReactNode }) {
  const { status, user } = useAuth();
  // Authenticated users use the server cart/wishlist; guests keep localStorage.
  const serverMode = status === 'authenticated';

  const cart = useCart(serverMode);
  // Server carts load asynchronously after login/reload — consumers must not
  // treat the pre-hydration state as an empty cart (e.g. checkout redirects).
  const [cartReady, setCartReady] = useState(!serverMode);
  // Flip cartReady at the same time the mode flips (render-phase adjustment,
  // the documented pattern for prop-driven state resets — avoids the lint
  // rule against sync setState inside the merge effect below).
  const [prevServerMode, setPrevServerMode] = useState(serverMode);
  if (prevServerMode !== serverMode) {
    setPrevServerMode(serverMode);
    setCartReady(!serverMode);
  }
  const filtersApi = useFilters();
  const { theme, toggleTheme } = useTheme();
  const wishlist = useWishlist(serverMode);
  const { toasts, addToast, removeToast } = useToast();
  const [recentIds, setRecentIds] = useState<number[]>(loadRecentIds);
  const [quickViewToy, setQuickViewToy] = useState<Toy | null>(null);

  // ── Guest → account migration ────────────────────────────────────────────
  // When the session becomes authenticated, merge the anonymous localStorage
  // cart/wishlist into the account (server caps at stock), then load the
  // server cart/wishlist as the UI source of truth. Guarded per user id so a
  // session refresh never re-merges, but a logout → different-user login does.
  const mergedForUser = useRef<number | null>(null);
  useEffect(() => {
    if (status !== 'authenticated' || !user) {
      mergedForUser.current = null; // guest (or loading) — allow a merge next login
      return;
    }
    if (mergedForUser.current === user.id) return; // already merged for this account
    mergedForUser.current = user.id;

    const guestCart = cart.items.map(i => ({ productId: i.id, quantity: i.quantity }));
    const guestWishlist = [...wishlist.ids];
    // Retire the anonymous localStorage copies immediately — they are captured
    // in guestCart/guestWishlist above, and a fast reload must not re-send
    // them and double the account quantities. If the merge fails they are
    // restored so a retry still sees the guest data.
    localStorage.removeItem(CART_STORAGE_KEY);
    localStorage.removeItem(WISHLIST_STORAGE_KEY);
    let cancelled = false;

    (async () => {
      try {
        const result = await mergeGuestData(guestCart, guestWishlist);
        const [serverCart, serverWishlist] = await Promise.all([loadServerCart(), loadServerWishlist()]);
        if (cancelled) return;
        cart.replace(serverCart);
        wishlist.replace(serverWishlist);
        if (result.capped.length > 0) {
          addToast('Some items were limited to available stock', 'info');
        }
      } catch {
        // Merge failed (network) — restore the guest copies so a later merge
        // (or the guest mode fallback) still has the data.
        if (!cancelled) {
          saveCart(cart.items);
          saveWishlist(wishlist.ids);
        }
      } finally {
        if (!cancelled) setCartReady(true);
      }
    })();

    return () => {
      cancelled = true;
    };
    // Snapshot semantics: cart/wishlist are intentionally not dependencies.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, user]);

  // ── Cart mutations (server-backed when authenticated) ────────────────────
  const addToCart = useCallback(
    (toy: Toy, quantity: number = 1) => {
      if (serverMode) {
        addServerCartItem(toy.id, quantity)
          .then(cart.replace)
          .catch(() => addToast('Could not update your cart — please try again', 'error'));
      } else {
        for (let i = 0; i < quantity; i++) {
          cart.addItem(toy);
        }
      }
      addToast(`${toy.name} added to cart!`, 'success');
    },
    [serverMode, cart, addToast]
  );

  const updateCartQuantity = useCallback(
    (id: number, quantity: number) => {
      if (serverMode) {
        const op = quantity <= 0 ? removeServerCartItem(id) : updateServerCartItem(id, quantity);
        op.then(cart.replace).catch(() => addToast('Could not update your cart', 'error'));
        return;
      }
      cart.updateQuantity(id, quantity);
    },
    [serverMode, cart, addToast]
  );

  const removeFromCart = useCallback(
    (id: number) => {
      if (serverMode) {
        removeServerCartItem(id)
          .then(cart.replace)
          .catch(() => addToast('Could not update your cart', 'error'));
        return;
      }
      cart.removeItem(id);
    },
    [serverMode, cart, addToast]
  );

  const clearCart = useCallback(() => {
    if (serverMode) {
      clearServerCart().catch(() => addToast('Could not clear your cart', 'error'));
      cart.replace([]);
      return;
    }
    cart.clearCart();
  }, [serverMode, cart, addToast]);

  const toggleWishlist = useCallback(
    (toy: Toy) => {
      if (serverMode) {
        const removing = wishlist.ids.includes(toy.id);
        const op = removing ? removeServerWishlistItem(toy.id) : addServerWishlistItem(toy.id);
        op.then(wishlist.replace).catch(() => addToast('Could not update your wishlist', 'error'));
        return;
      }
      wishlist.toggleItem(toy);
    },
    [serverMode, wishlist, addToast]
  );

  const markViewed = useCallback((id: number) => {
    setRecentIds(addRecentId(id));
  }, []);

  const openQuickView = useCallback((toy: Toy) => setQuickViewToy(toy), []);
  const closeQuickView = useCallback(() => setQuickViewToy(null), []);

  const reorder = useCallback(
    (order: Order) => {
      let added = 0;
      if (serverMode) {
        const ops: Promise<CartItem[]>[] = [];
        order.items.forEach(item => {
          if (!getProductById(item.id)) return;
          added += item.quantity;
          ops.push(addServerCartItem(item.id, item.quantity));
        });
        if (ops.length > 0) {
          Promise.all(ops)
            .then(results => cart.replace(results[results.length - 1]))
            .catch(() => addToast('Could not reorder these items', 'error'));
        }
      } else {
        order.items.forEach(item => {
          const toy = getProductById(item.id);
          if (!toy) return;
          for (let i = 0; i < item.quantity; i++) {
            cart.addItem(toy);
            added += 1;
          }
        });
      }
      if (added > 0) {
        addToast(`${added} item${added === 1 ? '' : 's'} added back to your cart`, 'info');
      } else {
        addToast('These items are no longer available', 'error');
      }
    },
    [serverMode, cart, addToast]
  );

  const value = useMemo<ShopContextValue>(() => ({
    cartItems: cart.items,
    cartReady,
    addToCart,
    updateCartQuantity,
    removeFromCart,
    clearCart,
    cartTotalItems: cart.totalItems,
    cartTotalPrice: cart.totalPrice,

    wishlistIds: wishlist.ids,
    toggleWishlist,
    isInWishlist: wishlist.isInWishlist,
    wishlistCount: wishlist.ids.length,

    theme,
    toggleTheme,

    toasts,
    addToast,
    removeToast,

    filters: filtersApi.filters,
    setFilter: filtersApi.setFilter,
    clearFilters: filtersApi.clearFilters,
    filteredProducts: filtersApi.filteredProducts,
    availableBrands: filtersApi.availableBrands,
    priceRange: filtersApi.priceRange,
    activeFilterCount: filtersApi.activeFilterCount,

    recentIds,
    markViewed,

    quickViewToy,
    openQuickView,
    closeQuickView,

    reorder,
  }), [
    cart.items, cart.totalItems, cart.totalPrice, cartReady,
    addToCart, updateCartQuantity, removeFromCart, clearCart,
    wishlist.ids, toggleWishlist, wishlist.isInWishlist,
    theme, toggleTheme,
    toasts, addToast, removeToast,
    filtersApi.filters, filtersApi.setFilter, filtersApi.clearFilters, filtersApi.filteredProducts,
    filtersApi.availableBrands, filtersApi.priceRange, filtersApi.activeFilterCount,
    recentIds, markViewed,
    quickViewToy, openQuickView, closeQuickView,
    reorder,
  ]);

  return (
    <ShopContext.Provider value={value}>
      {children}
    </ShopContext.Provider>
  );
}
