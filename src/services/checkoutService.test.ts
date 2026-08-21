import { beforeEach, describe, expect, it } from 'vitest';
import { CHECKOUT_STORAGE_KEY } from '../constants/checkout';
import { makeCartItem } from '../test/fixtures';
import type { CheckoutDraft } from '../types/checkout';
import {
  cartFingerprint,
  clearCheckoutDraft,
  draftToPayment,
  emptyPayment,
  emptyShipping,
  fingerprintsMatch,
  loadCheckoutDraft,
  saveCheckoutDraft,
  toDraftPayment,
} from './checkoutService';

function makeDraft(overrides: Partial<CheckoutDraft> = {}): CheckoutDraft {
  return {
    version: 1,
    step: 'shipping',
    shipping: emptyShipping(),
    payment: { method: 'card' },
    cart: [{ id: 1, quantity: 1 }],
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

describe('cart fingerprints', () => {
  it('builds id/quantity pairs', () => {
    expect(cartFingerprint([makeCartItem(1, 10, 2), makeCartItem(2, 5, 1)])).toEqual([
      { id: 1, quantity: 2 },
      { id: 2, quantity: 1 },
    ]);
  });

  it('detects quantity, content and length changes', () => {
    expect(fingerprintsMatch([{ id: 1, quantity: 2 }], [{ id: 1, quantity: 2 }])).toBe(true);
    expect(fingerprintsMatch([{ id: 1, quantity: 2 }], [{ id: 1, quantity: 3 }])).toBe(false);
    expect(fingerprintsMatch([{ id: 1, quantity: 1 }], [{ id: 2, quantity: 1 }])).toBe(false);
    expect(fingerprintsMatch([{ id: 1, quantity: 1 }], [])).toBe(false);
  });
});

describe('checkout draft persistence', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('round-trips a draft', () => {
    saveCheckoutDraft(makeDraft({ step: 'review' }));
    expect(loadCheckoutDraft()?.step).toBe('review');
    expect(loadCheckoutDraft()?.cart).toEqual([{ id: 1, quantity: 1 }]);
  });

  it('returns null for malformed data', () => {
    localStorage.setItem(CHECKOUT_STORAGE_KEY, '{not json');
    expect(loadCheckoutDraft()).toBeNull();

    localStorage.setItem(CHECKOUT_STORAGE_KEY, JSON.stringify({ version: 99 }));
    expect(loadCheckoutDraft()).toBeNull();

    const badShipping = { ...makeDraft(), shipping: { firstName: 123 } };
    localStorage.setItem(CHECKOUT_STORAGE_KEY, JSON.stringify(badShipping));
    expect(loadCheckoutDraft()).toBeNull();

    const badStep = { ...makeDraft(), step: 'nope' };
    localStorage.setItem(CHECKOUT_STORAGE_KEY, JSON.stringify(badStep));
    expect(loadCheckoutDraft()).toBeNull();
  });

  it('clears the draft', () => {
    saveCheckoutDraft(makeDraft());
    clearCheckoutDraft();
    expect(loadCheckoutDraft()).toBeNull();
  });

  it('never persists CVV or the full card number', () => {
    const payment = emptyPayment();
    payment.card.cardName = 'Jane Doe';
    payment.card.cardNumber = '4242 4242 4242 4242';
    payment.card.cvv = '123';
    payment.card.expiry = '12/30';

    saveCheckoutDraft(makeDraft({ payment: toDraftPayment(payment) }));

    const raw = localStorage.getItem(CHECKOUT_STORAGE_KEY) ?? '';
    expect(raw).not.toContain('cvv');
    expect(raw).not.toContain('4242 4242 4242 4242');
    expect(raw).not.toContain('12/30');

    expect(loadCheckoutDraft()?.payment).toEqual({ method: 'card', cardName: 'Jane Doe', cardLast4: '4242' });
  });
});

describe('draft payment conversion', () => {
  it('extracts only safe display fields per method', () => {
    const card = emptyPayment();
    card.card.cardName = 'Jane Doe';
    card.card.cardNumber = '4242 4242 4242 4242';
    expect(toDraftPayment(card)).toEqual({ method: 'card', cardName: 'Jane Doe', cardLast4: '4242' });

    const upi = emptyPayment();
    upi.method = 'upi';
    upi.upiId = 'user@bank';
    expect(toDraftPayment(upi)).toEqual({ method: 'upi', upiId: 'user@bank' });

    const cod = emptyPayment();
    cod.method = 'cod';
    expect(toDraftPayment(cod)).toEqual({ method: 'cod' });
  });

  it('rehydrates editable state with card secrets left empty', () => {
    const restored = draftToPayment({ method: 'card', cardName: 'Jane Doe', cardLast4: '4242' });
    expect(restored.method).toBe('card');
    expect(restored.card.cardName).toBe('Jane Doe');
    expect(restored.card.cardNumber).toBe('');
    expect(restored.card.cvv).toBe('');
    expect(restored.card.expiry).toBe('');
  });
});
