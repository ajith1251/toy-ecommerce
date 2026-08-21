import { describe, expect, it } from 'vitest';
import { emptyPayment, emptyShipping } from '../services/checkoutService';
import type { PaymentFormData, ShippingFormData } from '../types/checkout';
import {
  hasErrors,
  isValidCardNumber,
  isValidCvv,
  isValidEmail,
  isValidExpiry,
  isValidPhone,
  isValidPostalCode,
  isValidUpiId,
  validatePayment,
  validateShipping,
} from './validation';

// ── Primitive validators ────────────────────────────────────────────────────

describe('isValidEmail', () => {
  it('accepts standard addresses', () => {
    expect(isValidEmail('jane@example.com')).toBe(true);
    expect(isValidEmail('a.b+c@sub.domain.co')).toBe(true);
  });

  it('trims surrounding whitespace', () => {
    expect(isValidEmail('  jane@example.com  ')).toBe(true);
  });

  it('rejects malformed addresses', () => {
    expect(isValidEmail('')).toBe(false);
    expect(isValidEmail('jane@example')).toBe(false);
    expect(isValidEmail('jane@.com')).toBe(false);
    expect(isValidEmail('jane example.com')).toBe(false);
    expect(isValidEmail('@example.com')).toBe(false);
    expect(isValidEmail('jane@example.')).toBe(false);
  });
});

describe('isValidCardNumber (Luhn)', () => {
  it('accepts valid test card numbers', () => {
    expect(isValidCardNumber('4242 4242 4242 4242')).toBe(true);
    expect(isValidCardNumber('4111 1111 1111 1111')).toBe(true);
    expect(isValidCardNumber('5555555555554444')).toBe(true);
  });

  it('rejects numbers that fail the Luhn check', () => {
    expect(isValidCardNumber('4242 4242 4242 4241')).toBe(false);
    expect(isValidCardNumber('4111 1111 1111 1112')).toBe(false);
  });

  it('rejects wrong lengths and garbage', () => {
    expect(isValidCardNumber('')).toBe(false);
    expect(isValidCardNumber('123')).toBe(false);
    expect(isValidCardNumber('not-a-card')).toBe(false);
    expect(isValidCardNumber('42424242424242424242424242')).toBe(false);
  });
});

describe('isValidExpiry', () => {
  it('accepts MM/YY formats in the future', () => {
    expect(isValidExpiry('12/30')).toBe(true);
    expect(isValidExpiry('12 / 30')).toBe(true);
  });

  it('rejects expired, malformed and out-of-range dates', () => {
    expect(isValidExpiry('01/20')).toBe(false); // expired
    expect(isValidExpiry('13/30')).toBe(false); // bad month
    expect(isValidExpiry('00/30')).toBe(false); // zero month
    expect(isValidExpiry('12/3')).toBe(false); // wrong shape
    expect(isValidExpiry('not-a-date')).toBe(false);
    expect(isValidExpiry('')).toBe(false);
  });
});

describe('isValidCvv', () => {
  it('accepts 3 and 4 digit codes', () => {
    expect(isValidCvv('123')).toBe(true);
    expect(isValidCvv('1234')).toBe(true);
  });

  it('rejects anything else', () => {
    expect(isValidCvv('')).toBe(false);
    expect(isValidCvv('12')).toBe(false);
    expect(isValidCvv('12345')).toBe(false);
    expect(isValidCvv('abc')).toBe(false);
  });
});

describe('isValidPhone', () => {
  it('accepts common international formats (7–15 digits)', () => {
    expect(isValidPhone('+1 555 123 4567')).toBe(true);
    expect(isValidPhone('1234567')).toBe(true); // boundary low
    expect(isValidPhone('123456789012345')).toBe(true); // boundary high
    expect(isValidPhone('(555) 123-4567')).toBe(true);
  });

  it('rejects too-short and too-long numbers', () => {
    expect(isValidPhone('')).toBe(false);
    expect(isValidPhone('123456')).toBe(false); // 6 digits
    expect(isValidPhone('1234567890123456')).toBe(false); // 16 digits
  });
});

describe('isValidPostalCode', () => {
  it('accepts US, UK, CA and IN formats', () => {
    expect(isValidPostalCode('90210')).toBe(true);
    expect(isValidPostalCode('12345-6789')).toBe(true);
    expect(isValidPostalCode('SW1A 1AA')).toBe(true);
    expect(isValidPostalCode('560001')).toBe(true);
  });

  it('trims whitespace', () => {
    expect(isValidPostalCode('  90210  ')).toBe(true);
  });

  it('rejects values that are too short or contain invalid characters', () => {
    expect(isValidPostalCode('')).toBe(false);
    expect(isValidPostalCode('AB')).toBe(false); // 2 chars
    expect(isValidPostalCode('90!210')).toBe(false);
  });
});

describe('isValidUpiId', () => {
  it('accepts name@bank shapes', () => {
    expect(isValidUpiId('user@bank')).toBe(true);
    expect(isValidUpiId('user.name-123@hdfcbank')).toBe(true);
  });

  it('rejects malformed ids', () => {
    expect(isValidUpiId('')).toBe(false);
    expect(isValidUpiId('user@')).toBe(false);
    expect(isValidUpiId('@bank')).toBe(false);
    expect(isValidUpiId('user@bank!')).toBe(false);
    expect(isValidUpiId('u@b')).toBe(false); // too short on both sides
  });
});

// ── Domain validators ───────────────────────────────────────────────────────

function filledShipping(): ShippingFormData {
  return {
    ...emptyShipping(),
    firstName: 'Jane',
    lastName: 'Doe',
    email: 'jane@example.com',
    phone: '+1 555 123 4567',
    line1: '123 Toy Lane',
    city: 'Springfield',
    state: 'CA',
    postalCode: '90210',
    country: 'United States',
  };
}

function filledCard(): PaymentFormData {
  const payment = emptyPayment();
  payment.card.cardName = 'Jane Doe';
  payment.card.cardNumber = '4242 4242 4242 4242';
  payment.card.expiry = '12/30';
  payment.card.cvv = '123';
  return payment;
}

describe('validateShipping', () => {
  it('returns no errors for a valid address', () => {
    expect(validateShipping(filledShipping())).toEqual({});
  });

  it('flags every required field when empty', () => {
    const errors = validateShipping(emptyShipping());
    expect(errors).toMatchObject({
      firstName: 'First name is required',
      lastName: 'Last name is required',
      email: 'Email is required',
      phone: 'Phone number is required',
      line1: 'Address line 1 is required',
      city: 'City is required',
      state: 'State / province is required',
      postalCode: 'Postal code is required',
      country: 'Country is required',
    });
  });

  it('treats whitespace-only values as missing', () => {
    const errors = validateShipping({ ...filledShipping(), firstName: '   ', email: '  ' });
    expect(errors.firstName).toBe('First name is required');
    expect(errors.email).toBe('Email is required');
  });

  it('reports format errors for email, phone and postal code', () => {
    const errors = validateShipping({
      ...filledShipping(),
      email: 'not-an-email',
      phone: '123',
      postalCode: 'AB',
    });
    expect(errors.email).toBe('Enter a valid email address');
    expect(errors.phone).toBe('Enter a valid phone number');
    expect(errors.postalCode).toBe('Enter a valid postal code');
  });
});

describe('validatePayment', () => {
  it('returns no errors for a valid card', () => {
    expect(validatePayment(filledCard())).toEqual({ card: {} });
  });

  it('flags all card fields when empty', () => {
    const payment = emptyPayment();
    const errors = validatePayment(payment);
    expect(errors.card).toMatchObject({
      cardName: 'Name on card is required',
      cardNumber: 'Card number is required',
      expiry: 'Expiry is required',
      cvv: 'CVV is required',
    });
  });

  it('reports format errors for a card that fails Luhn and expiry', () => {
    const payment = filledCard();
    payment.card.cardNumber = '4242 4242 4242 4241';
    payment.card.expiry = '01/20';
    payment.card.cvv = '12';
    const errors = validatePayment(payment);
    expect(errors.card.cardNumber).toBe('Enter a valid card number');
    expect(errors.card.expiry).toBe('Enter a valid future expiry (MM/YY)');
    expect(errors.card.cvv).toBe('CVV must be 3-4 digits');
  });

  it('requires a well-formed UPI id', () => {
    const payment = emptyPayment();
    payment.method = 'upi';
    expect(validatePayment(payment).upiId).toBe('UPI ID is required');

    payment.upiId = 'notvalid';
    expect(validatePayment(payment).upiId).toBe('Enter a valid UPI ID (e.g. name@bank)');

    payment.upiId = 'user@bank';
    expect(validatePayment(payment)).toEqual({ card: {} });
  });

  it('requires no credentials for cash on delivery', () => {
    const payment = emptyPayment();
    payment.method = 'cod';
    expect(validatePayment(payment)).toEqual({ card: {} });
  });
});

describe('hasErrors', () => {
  it('detects errors in both shipping and payment shapes', () => {
    expect(hasErrors({})).toBe(false);
    expect(hasErrors({ firstName: 'required' })).toBe(true);
    expect(hasErrors({ card: {} })).toBe(false);
    expect(hasErrors({ card: { cvv: 'required' } })).toBe(true);
    expect(hasErrors({ card: {}, upiId: 'required' })).toBe(true);
  });
});
