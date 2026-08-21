import type { CardFormData, PaymentErrors, PaymentFormData, ShippingErrors, ShippingFormData } from '../types/checkout';

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export function isValidCardNumber(raw: string): boolean {
  const digits = raw.replace(/\D/g, '');
  if (!/^\d{13,19}$/.test(digits)) return false;

  let sum = 0;
  let double = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let d = parseInt(digits[i], 10);
    if (double) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
    double = !double;
  }
  return sum % 10 === 0;
}

/** Accepts "MM/YY" and returns true only when the month is valid and the card has not expired. */
export function isValidExpiry(raw: string): boolean {
  const match = raw.trim().match(/^(\d{2})\s*\/\s*(\d{2})$/);
  if (!match) return false;
  const month = parseInt(match[1], 10);
  const year = 2000 + parseInt(match[2], 10);
  if (month < 1 || month > 12) return false;

  const now = new Date();
  const expiry = new Date(year, month, 0, 23, 59, 59); // last day of expiry month
  return expiry >= now;
}

export function isValidCvv(raw: string): boolean {
  return /^\d{3,4}$/.test(raw.trim());
}

/** Accepts common international phone formats (7–15 digits, +, spaces, dashes, parens). */
export function isValidPhone(raw: string): boolean {
  const digits = raw.replace(/\D/g, '');
  return digits.length >= 7 && digits.length <= 15;
}

/** Accepts US ZIP/ZIP+4, Indian PINs, UK/Canadian alphanumeric postcodes. */
export function isValidPostalCode(raw: string): boolean {
  return /^[A-Za-z0-9][A-Za-z0-9\s-]{2,9}$/.test(raw.trim());
}

/** Accepts standard UPI IDs like `name@bank`. */
export function isValidUpiId(raw: string): boolean {
  return /^[a-zA-Z0-9.\-_]{2,}@[a-zA-Z]{2,}$/.test(raw.trim());
}

export function validateShipping(form: ShippingFormData): ShippingErrors {
  const errors: ShippingErrors = {};

  if (!form.firstName.trim()) errors.firstName = 'First name is required';
  if (!form.lastName.trim()) errors.lastName = 'Last name is required';
  if (!form.email.trim()) errors.email = 'Email is required';
  else if (!isValidEmail(form.email)) errors.email = 'Enter a valid email address';
  if (!form.phone.trim()) errors.phone = 'Phone number is required';
  else if (!isValidPhone(form.phone)) errors.phone = 'Enter a valid phone number';
  if (!form.line1.trim()) errors.line1 = 'Address line 1 is required';
  if (!form.city.trim()) errors.city = 'City is required';
  if (!form.state.trim()) errors.state = 'State / province is required';
  if (!form.postalCode.trim()) errors.postalCode = 'Postal code is required';
  else if (!isValidPostalCode(form.postalCode)) errors.postalCode = 'Enter a valid postal code';
  if (!form.country.trim()) errors.country = 'Country is required';

  return errors;
}

export function validatePayment(form: PaymentFormData): PaymentErrors {
  const cardErrors: Partial<Record<keyof CardFormData, string>> = {};

  if (form.method === 'card') {
    if (!form.card.cardName.trim()) cardErrors.cardName = 'Name on card is required';
    if (!form.card.cardNumber.trim()) cardErrors.cardNumber = 'Card number is required';
    else if (!isValidCardNumber(form.card.cardNumber)) cardErrors.cardNumber = 'Enter a valid card number';
    if (!form.card.expiry.trim()) cardErrors.expiry = 'Expiry is required';
    else if (!isValidExpiry(form.card.expiry)) cardErrors.expiry = 'Enter a valid future expiry (MM/YY)';
    if (!form.card.cvv.trim()) cardErrors.cvv = 'CVV is required';
    else if (!isValidCvv(form.card.cvv)) cardErrors.cvv = 'CVV must be 3-4 digits';
    return { card: cardErrors };
  }

  if (form.method === 'upi') {
    if (!form.upiId.trim()) return { card: {}, upiId: 'UPI ID is required' };
    if (!isValidUpiId(form.upiId)) return { card: {}, upiId: 'Enter a valid UPI ID (e.g. name@bank)' };
    return { card: {} };
  }

  // Cash on delivery requires no payment credentials.
  return { card: {} };
}

export function hasErrors(errors: ShippingErrors | PaymentErrors): boolean {
  if ('card' in errors) {
    return Object.keys(errors.card).length > 0 || !!errors.upiId;
  }
  return Object.keys(errors).length > 0;
}
