import { CURRENCY, DISCOUNT_RATE, FREE_SHIPPING_THRESHOLD, SHIPPING_FEE, TAX_RATE } from '../constants/checkout';
import type { CartItem } from '../types';
import type { OrderPricing } from '../types/order';

/** Alias of OrderPricing (types/order.ts) — one pricing shape everywhere. */
export type OrderTotals = OrderPricing;

/**
 * Single source of truth for cart/order pricing. Both the cart drawer and
 * every checkout step derive their numbers from this function so totals
 * can never drift apart.
 */
export function calcTotals(items: CartItem[]): OrderPricing {
  const subtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const discount = subtotal * DISCOUNT_RATE;
  const taxable = subtotal - discount;
  const shipping = subtotal === 0 || subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_FEE;
  const tax = taxable * TAX_RATE;
  const grandTotal = taxable + shipping + tax;
  return { subtotal, discount, shipping, tax, grandTotal };
}

/** Formats an amount using the centralized currency symbol. */
export function formatMoney(amount: number): string {
  return `${CURRENCY}${amount.toFixed(2)}`;
}
