import { useState, useCallback, useEffect } from 'react';
import type { Toy } from '../types';
import {
  addCartItem,
  calcCartSubtotal,
  countCartItems,
  loadCart,
  removeCartItem,
  saveCart,
  updateCartQuantity,
} from '../services/cartService';

/**
 * Cart state hook. Owns React state only — item mutations and persistence
 * live in cartService so they are pure and independently testable.
 *
 *   UI → useCart → cartService → localStorage (guest) / server (account)
 *
 * In `serverMode` (authenticated) localStorage is NOT the source of truth —
 * ShopProvider reconciles state with the server cart; on logout the hook
 * rehydrates from localStorage (the guest cart).
 */
export function useCart(serverMode = false) {
  const [items, setItems] = useState(loadCart);

  useEffect(() => {
    if (!serverMode) saveCart(items);
  }, [items, serverMode]);

  // Back to guest mode (logout): rehydrate the anonymous localStorage cart.
  // Render-phase adjustment (React's documented pattern for prop-driven
  // state resets) — avoids a setState-in-effect cascade.
  const [prevMode, setPrevMode] = useState(serverMode);
  if (prevMode !== serverMode) {
    setPrevMode(serverMode);
    if (!serverMode) setItems(loadCart());
  }

  const addItem = useCallback((toy: Toy) => {
    setItems(prev => addCartItem(prev, toy));
  }, []);

  const removeItem = useCallback((id: number) => {
    setItems(prev => removeCartItem(prev, id));
  }, []);

  const updateQuantity = useCallback((id: number, quantity: number) => {
    setItems(prev => updateCartQuantity(prev, id, quantity));
  }, []);

  const clearCart = useCallback(() => setItems([]), []);

  /** Replaces the whole cart from a server response. */
  const replace = useCallback((next: Parameters<typeof setItems>[0]) => setItems(next), []);

  const totalItems = countCartItems(items);
  const totalPrice = calcCartSubtotal(items);

  return {
    items,
    addItem,
    removeItem,
    updateQuantity,
    clearCart,
    replace,
    totalItems,
    totalPrice,
  };
}
