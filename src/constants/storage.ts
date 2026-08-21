/**
 * Central registry of every localStorage key the app uses. No scattered
 * magic strings — import the key from here (or from a service that wraps it).
 */
export const CART_STORAGE_KEY = 'toybox-cart';
export const WISHLIST_STORAGE_KEY = 'toybox-wishlist';
export const RECENT_STORAGE_KEY = 'toybox-recent';
export const THEME_STORAGE_KEY = 'toybox-theme';
export const FILTERS_STORAGE_KEY = 'toybox-filters';
export const ORDERS_STORAGE_KEY = 'toybox-orders';
export const CHECKOUT_DRAFT_STORAGE_KEY = 'toybox-checkout-draft';

/** Anonymous browser id scoping server-side carts/wishlists/orders. */
export const ANON_ID_STORAGE_KEY = 'toybox-anon-id';
