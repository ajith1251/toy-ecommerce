import { describe, expect, it } from 'vitest';
import { calcTotals, formatMoney } from './orderCalculations';
import { makeCartItem } from '../test/fixtures';

describe('calcTotals', () => {
  it('returns zeroed totals for an empty cart', () => {
    expect(calcTotals([])).toEqual({ subtotal: 0, discount: 0, shipping: 0, tax: 0, grandTotal: 0 });
  });

  it('computes the subtotal from quantity and unit price', () => {
    const totals = calcTotals([makeCartItem(1, 10, 2), makeCartItem(2, 5.5, 3)]);
    expect(totals.subtotal).toBeCloseTo(36.5);
  });

  it('charges a shipping fee below the free-shipping threshold', () => {
    const totals = calcTotals([makeCartItem(1, 29.99, 1)]);
    expect(totals.shipping).toBeCloseTo(5.99);
    expect(totals.tax).toBeCloseTo(29.99 * 0.08);
    expect(totals.grandTotal).toBeCloseTo(29.99 + 5.99 + 29.99 * 0.08);
  });

  it('offers free shipping at and above the threshold', () => {
    expect(calcTotals([makeCartItem(1, 50, 1)]).shipping).toBe(0);
    expect(calcTotals([makeCartItem(1, 24.99, 1), makeCartItem(2, 29.99, 1)]).shipping).toBe(0);
  });

  it('keeps discount at zero until promotions exist', () => {
    expect(calcTotals([makeCartItem(1, 10, 1)]).discount).toBe(0);
  });

  it('rounds grandTotal consistently with the cart', () => {
    const totals = calcTotals([makeCartItem(1, 19.99, 2)]);
    // Subtotal 39.98 is below the free-shipping threshold, so the flat fee applies.
    const expected = 39.98 + 5.99 + 39.98 * 0.08;
    expect(totals.grandTotal).toBeCloseTo(expected);
  });

  it('charges shipping just below the threshold and waives it exactly at the threshold', () => {
    expect(calcTotals([makeCartItem(1, 49.99, 1)]).shipping).toBeCloseTo(5.99);
    // Two items summing exactly to the threshold.
    expect(calcTotals([makeCartItem(1, 25, 2)]).shipping).toBe(0);
  });

  it('accumulates decimal prices without drifting', () => {
    // 0.1-style float traps: many small decimal line items must stay exact.
    const totals = calcTotals([makeCartItem(1, 0.1, 3)]);
    expect(totals.subtotal).toBeCloseTo(0.3);
    const many = calcTotals([
      makeCartItem(1, 19.99, 1),
      makeCartItem(2, 9.99, 1),
      makeCartItem(3, 4.49, 1),
      makeCartItem(4, 0.89, 1),
    ]);
    expect(many.subtotal).toBeCloseTo(35.36);
  });

  it('handles large quantities consistently', () => {
    const totals = calcTotals([makeCartItem(1, 2.5, 1000)]);
    expect(totals.subtotal).toBeCloseTo(2500);
    expect(totals.shipping).toBe(0); // far above the threshold
    expect(totals.grandTotal).toBeCloseTo(2500 + 2500 * 0.08);
  });

  it('keeps arithmetic consistent: grandTotal = subtotal + shipping + tax', () => {
    const cases = [
      [],
      [makeCartItem(1, 29.99, 1)],
      [makeCartItem(1, 12.5, 2), makeCartItem(2, 8.25, 3)],
      [makeCartItem(1, 49.99, 1)],
      [makeCartItem(1, 19.99, 1), makeCartItem(2, 5.99, 2)],
    ];
    for (const items of cases) {
      const totals = calcTotals(items);
      expect(totals.subtotal).toBeGreaterThanOrEqual(0);
      expect(totals.grandTotal).toBeCloseTo(totals.subtotal + totals.shipping + totals.tax);
    }
  });
});

describe('formatMoney', () => {
  it('uses the centralized currency symbol', () => {
    expect(formatMoney(38.38)).toBe('$38.38');
    expect(formatMoney(0)).toBe('$0.00');
  });
});
