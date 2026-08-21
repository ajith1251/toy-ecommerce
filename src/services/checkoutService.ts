import { EMPTY_PAYMENT, EMPTY_SHIPPING } from '../constants/checkout';
import { CHECKOUT_DRAFT_STORAGE_KEY } from '../constants/storage';
import { storage } from '../lib/storage';
import type { CartItem } from '../types';
import type {
  CartFingerprint,
  CheckoutDraft,
  CheckoutDraftPayment,
  CheckoutStep,
  PaymentFormData,
  ShippingFormData,
} from '../types/checkout';
import type { PaymentMethod } from '../types/order';

const STEPS: CheckoutStep[] = ['shipping', 'payment', 'review'];

export function cartFingerprint(items: CartItem[]): CartFingerprint {
  return items.map(i => ({ id: i.id, quantity: i.quantity }));
}

export function fingerprintsMatch(a: CartFingerprint, b: CartFingerprint): boolean {
  if (a.length !== b.length) return false;
  return a.every((item, index) => item.id === b[index]?.id && item.quantity === b[index]?.quantity);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isShippingForm(value: unknown): value is ShippingFormData {
  if (!isRecord(value)) return false;
  const fields = ['firstName', 'lastName', 'email', 'phone', 'line1', 'line2', 'city', 'state', 'postalCode', 'country'];
  return fields.every(f => typeof value[f] === 'string');
}

function isDraftPayment(value: unknown): value is CheckoutDraftPayment {
  if (!isRecord(value)) return false;
  const methods: PaymentMethod[] = ['card', 'upi', 'cod'];
  if (typeof value.method !== 'string' || !methods.includes(value.method as PaymentMethod)) return false;
  if (value.cardName !== undefined && typeof value.cardName !== 'string') return false;
  if (value.cardLast4 !== undefined && typeof value.cardLast4 !== 'string') return false;
  if (value.upiId !== undefined && typeof value.upiId !== 'string') return false;
  return true;
}

function isFingerprint(value: unknown): value is CartFingerprint {
  if (!Array.isArray(value)) return false;
  return value.every(
    item =>
      isRecord(item) &&
      typeof item.id === 'number' &&
      typeof item.quantity === 'number' &&
      item.quantity > 0
  );
}

export function isValidDraft(value: unknown): value is CheckoutDraft {
  if (!isRecord(value)) return false;
  if (value.version !== 1) return false;
  if (typeof value.step !== 'string' || !STEPS.includes(value.step as CheckoutStep)) return false;
  if (!isShippingForm(value.shipping)) return false;
  if (!isDraftPayment(value.payment)) return false;
  if (!isFingerprint(value.cart)) return false;
  if (typeof value.updatedAt !== 'string') return false;
  return true;
}

export function saveCheckoutDraft(draft: CheckoutDraft): void {
  storage.set(CHECKOUT_DRAFT_STORAGE_KEY, draft);
}

export function loadCheckoutDraft(): CheckoutDraft | null {
  return storage.get<CheckoutDraft | null>(CHECKOUT_DRAFT_STORAGE_KEY, null, isValidDraft);
}

export function clearCheckoutDraft(): void {
  storage.remove(CHECKOUT_DRAFT_STORAGE_KEY);
}

/**
 * Builds the safe persistable payment snapshot. CVV and the full card
 * number are intentionally excluded.
 */
export function toDraftPayment(payment: PaymentFormData): CheckoutDraftPayment {
  const digits = payment.card.cardNumber.replace(/\D/g, '');
  const base: CheckoutDraftPayment = { method: payment.method };
  if (payment.method === 'card') {
    base.cardName = payment.card.cardName.trim() || undefined;
    base.cardLast4 = digits.length > 0 ? digits.slice(-4) : undefined;
  } else if (payment.method === 'upi') {
    base.upiId = payment.upiId.trim() || undefined;
  }
  return base;
}

/** Rehydrates editable payment state from a draft. Card fields stay empty — they are never persisted. */
export function draftToPayment(draft: CheckoutDraftPayment | undefined): PaymentFormData {
  return {
    method: draft?.method ?? EMPTY_PAYMENT.method,
    card: {
      cardName: draft?.cardName ?? '',
      cardNumber: '',
      expiry: '',
      cvv: '',
    },
    upiId: draft?.upiId ?? '',
  };
}

export function emptyShipping(): ShippingFormData {
  return { ...EMPTY_SHIPPING };
}

export function emptyPayment(): PaymentFormData {
  return {
    method: EMPTY_PAYMENT.method,
    card: { ...EMPTY_PAYMENT.card },
    upiId: '',
  };
}
