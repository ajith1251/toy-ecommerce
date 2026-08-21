import { createContext, useContext } from 'react';
import type { CartItem, Order, Toy } from '../types';
import type { FilterState } from '../utils/productFilters';
import type { Toast } from '../hooks/useToast';

export interface ShopContextValue {
  // Cart
  cartItems: CartItem[];
  /** False while the server cart is still hydrating (authenticated sessions)
   *  — consumers must not treat a not-yet-loaded cart as empty. */
  cartReady: boolean;
  addToCart: (toy: Toy, quantity?: number) => void;
  updateCartQuantity: (id: number, quantity: number) => void;
  removeFromCart: (id: number) => void;
  clearCart: () => void;
  cartTotalItems: number;
  cartTotalPrice: number;

  // Wishlist
  wishlistIds: number[];
  toggleWishlist: (toy: Toy) => void;
  isInWishlist: (id: number) => boolean;
  wishlistCount: number;

  // Theme
  theme: 'light' | 'dark';
  toggleTheme: () => void;

  // Toasts
  toasts: Toast[];
  addToast: (message: string, type?: Toast['type']) => void;
  removeToast: (id: string) => void;

  // Filters
  filters: FilterState;
  setFilter: <K extends keyof FilterState>(key: K, value: FilterState[K]) => void;
  clearFilters: () => void;
  filteredProducts: Toy[];
  availableBrands: string[];
  priceRange: { min: number; max: number };
  activeFilterCount: number;

  // Recently viewed
  recentIds: number[];
  markViewed: (id: number) => void;

  // Quick view modal
  quickViewToy: Toy | null;
  openQuickView: (toy: Toy) => void;
  closeQuickView: () => void;

  // Order actions
  reorder: (order: Order) => void;
}

export const ShopContext = createContext<ShopContextValue | null>(null);

export function useShop(): ShopContextValue {
  const ctx = useContext(ShopContext);
  if (!ctx) {
    throw new Error('useShop must be used within a ShopProvider');
  }
  return ctx;
}

