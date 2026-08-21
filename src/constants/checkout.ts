import type { PaymentMethod } from '../types/order';

/** Display currency. Centralized so it can be changed in one place. */
export const CURRENCY = '$';

/** Subtotal at or above this value qualifies for free shipping. */
export const FREE_SHIPPING_THRESHOLD = 50;

/** Flat shipping fee charged below the free-shipping threshold. */
export const SHIPPING_FEE = 5.99;

/** Tax rate applied to the (post-discount) subtotal. */
export const TAX_RATE = 0.08;

/** Reserved for future promotions — currently always 0. */
export const DISCOUNT_RATE = 0;

/** Estimated delivery window (in calendar days) shown after checkout. */
export const DELIVERY_DAYS_MIN = 3;
export const DELIVERY_DAYS_MAX = 5;

/** Simulated payment processing delay in milliseconds. */
export const PLACE_ORDER_DELAY_MS = 1400;

// Storage keys are centralized in constants/storage.ts; re-exported here for
// backwards compatibility with callers that import them from this module.
export { CHECKOUT_DRAFT_STORAGE_KEY as CHECKOUT_STORAGE_KEY, ORDERS_STORAGE_KEY as ORDER_STORAGE_KEY } from './storage';

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  card: 'Credit / Debit Card',
  upi: 'UPI',
  cod: 'Cash on Delivery',
};

export const EMPTY_SHIPPING = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  line1: '',
  line2: '',
  city: '',
  state: '',
  postalCode: '',
  country: '',
} as const;

export const EMPTY_PAYMENT = {
  method: 'card' as PaymentMethod,
  card: {
    cardName: '',
    cardNumber: '',
    expiry: '',
    cvv: '',
  },
  upiId: '',
} as const;
