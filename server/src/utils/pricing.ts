import type { OrderPricingDto } from '../types.js';

/**
 * Server-side pricing. These values intentionally mirror the frontend
 * constants (src/constants/checkout.ts); the sync test in
 * tests/pricing-sync.test.ts fails if they drift. The server — never the
 * client — is authoritative for order totals.
 */
export const FREE_SHIPPING_THRESHOLD = 50;
export const SHIPPING_FEE = 5.99;
export const TAX_RATE = 0.08;
export const DISCOUNT_RATE = 0;

export interface PricingLine {
  /** Current server price per unit. */
  unitPrice: number;
  quantity: number;
}

/** Rounds to cents using half-up decimal math (avoids float drift). */
export function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

/**
 * Calculates order totals from server prices. Empty carts are rejected
 * earlier by validation, but the function still handles them defensively.
 */
export function calcServerTotals(lines: PricingLine[]): OrderPricingDto {
  const subtotal = roundMoney(lines.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0));
  const discount = roundMoney(subtotal * DISCOUNT_RATE);
  const taxable = roundMoney(subtotal - discount);
  const shipping = subtotal === 0 || subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_FEE;
  const tax = roundMoney(taxable * TAX_RATE);
  const grandTotal = roundMoney(taxable + shipping + tax);
  return { subtotal, discount, shipping, tax, grandTotal };
}
