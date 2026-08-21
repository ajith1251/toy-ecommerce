import type { PaymentMethod } from './order';

export type CheckoutStep = 'shipping' | 'payment' | 'review';

export interface ShippingFormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  line1: string;
  line2: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

export interface CardFormData {
  cardName: string;
  cardNumber: string;
  expiry: string;
  cvv: string;
}

export interface PaymentFormData {
  method: PaymentMethod;
  card: CardFormData;
  upiId: string;
}

export type ShippingErrors = Partial<Record<keyof ShippingFormData, string>>;

export interface PaymentErrors {
  card: Partial<Record<keyof CardFormData, string>>;
  upiId?: string;
}

/** Lightweight cart fingerprint used to detect cart changes during checkout. */
export interface CartFingerprintItem {
  id: number;
  quantity: number;
}

export type CartFingerprint = CartFingerprintItem[];

/**
 * Safe checkout draft persisted to localStorage so an accidental refresh
 * does not destroy progress. Never contains CVV or the full card number.
 */
export interface CheckoutDraftPayment {
  method: PaymentMethod;
  cardName?: string;
  cardLast4?: string;
  upiId?: string;
}

export interface CheckoutDraft {
  version: 1;
  step: CheckoutStep;
  shipping: ShippingFormData;
  payment: CheckoutDraftPayment;
  cart: CartFingerprint;
  updatedAt: string;
}
