import { DELIVERY_DAYS_MAX, DELIVERY_DAYS_MIN } from '../constants/checkout';
import { api } from '../lib/api/client';
import type { CartItem } from '../types';
import type { PaymentFormData, ShippingFormData } from '../types/checkout';
import type { Order, OrderItem, OrderPayment, OrderStatus } from '../types/order';

const STATUSES: OrderStatus[] = ['confirmed', 'shipped', 'delivered'];
// Note: the server also supports 'cancelled', but the frontend order type
// (and UI) only models confirmed → shipped → delivered for now.

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function toNumber(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function toStatus(value: unknown): OrderStatus {
  return typeof value === 'string' && STATUSES.includes(value as OrderStatus) ? (value as OrderStatus) : 'confirmed';
}

function sanitizeOrderItem(raw: unknown): OrderItem | null {
  if (!isRecord(raw)) return null;
  if (typeof raw.id !== 'number' || typeof raw.name !== 'string') return null;
  if (typeof raw.price !== 'number' || !Number.isFinite(raw.price)) return null;
  const quantity = typeof raw.quantity === 'number' && raw.quantity > 0 ? raw.quantity : 1;
  return {
    id: raw.id,
    name: raw.name,
    image: typeof raw.image === 'string' ? raw.image : '',
    brand: typeof raw.brand === 'string' ? raw.brand : '',
    price: raw.price,
    quantity,
  };
}

/**
 * Defensively normalizes an order payload (from the API, or legacy persisted
 * records) into the current Order shape. Malformed records are dropped.
 */
export function sanitizeOrder(raw: unknown): Order | null {
  if (!isRecord(raw)) return null;

  const items = Array.isArray(raw.items)
    ? raw.items.map(sanitizeOrderItem).filter((i): i is OrderItem => i !== null)
    : [];

  if (isRecord(raw.customer) && isRecord(raw.shippingAddress) && isRecord(raw.payment) && isRecord(raw.pricing)) {
    if (typeof raw.id !== 'string' || typeof raw.createdAt !== 'string') return null;
    const paymentMethod =
      typeof raw.payment.method === 'string' &&
      ['card', 'upi', 'cod'].includes(raw.payment.method)
        ? (raw.payment.method as OrderPayment['method'])
        : 'card';
    const payment: OrderPayment = { method: paymentMethod };
    if (paymentMethod === 'card' && typeof raw.payment.last4 === 'string') payment.last4 = raw.payment.last4;
    if (paymentMethod === 'upi' && typeof raw.payment.upiId === 'string') payment.upiId = raw.payment.upiId;

    return {
      id: raw.id,
      createdAt: raw.createdAt,
      status: toStatus(raw.status),
      customer: {
        firstName: typeof raw.customer.firstName === 'string' ? raw.customer.firstName : '',
        lastName: typeof raw.customer.lastName === 'string' ? raw.customer.lastName : '',
        email: typeof raw.customer.email === 'string' ? raw.customer.email : '',
        phone: typeof raw.customer.phone === 'string' ? raw.customer.phone : '',
      },
      shippingAddress: {
        line1: typeof raw.shippingAddress.line1 === 'string' ? raw.shippingAddress.line1 : '',
        line2: typeof raw.shippingAddress.line2 === 'string' ? raw.shippingAddress.line2 : '',
        city: typeof raw.shippingAddress.city === 'string' ? raw.shippingAddress.city : '',
        state: typeof raw.shippingAddress.state === 'string' ? raw.shippingAddress.state : '',
        postalCode: typeof raw.shippingAddress.postalCode === 'string' ? raw.shippingAddress.postalCode : '',
        country: typeof raw.shippingAddress.country === 'string' ? raw.shippingAddress.country : '',
      },
      payment,
      items,
      pricing: {
        subtotal: toNumber(raw.pricing.subtotal),
        discount: toNumber(raw.pricing.discount),
        shipping: toNumber(raw.pricing.shipping),
        tax: toNumber(raw.pricing.tax),
        grandTotal: toNumber(raw.pricing.grandTotal),
      },
    };
  }

  // Legacy Phase 1 shape (pre-backend localStorage orders).
  if (typeof raw.id !== 'string' || !isRecord(raw.shippingInfo)) return null;

  const fullName = typeof raw.shippingInfo.fullName === 'string' ? raw.shippingInfo.fullName.trim() : '';
  const nameParts = fullName.split(/\s+/).filter(Boolean);
  const firstName = nameParts[0] ?? '';
  const lastName = nameParts.slice(1).join(' ');

  return {
    id: raw.id,
    createdAt: typeof raw.date === 'string' ? raw.date : new Date().toISOString(),
    status: toStatus(raw.status),
    customer: {
      firstName,
      lastName,
      email: typeof raw.shippingInfo.email === 'string' ? raw.shippingInfo.email : '',
      phone: typeof raw.shippingInfo.phone === 'string' ? raw.shippingInfo.phone : '',
    },
    shippingAddress: {
      line1: typeof raw.shippingInfo.address === 'string' ? raw.shippingInfo.address : '',
      line2: '',
      city: typeof raw.shippingInfo.city === 'string' ? raw.shippingInfo.city : '',
      state: typeof raw.shippingInfo.state === 'string' ? raw.shippingInfo.state : '',
      postalCode: typeof raw.shippingInfo.zip === 'string' ? raw.shippingInfo.zip : '',
      country: '',
    },
    payment: {
      method: 'card',
      ...(typeof raw.paymentLast4 === 'string' && raw.paymentLast4.length > 0
        ? { last4: raw.paymentLast4 }
        : {}),
    },
    items,
    pricing: {
      subtotal: toNumber(raw.subtotal),
      discount: 0,
      shipping: toNumber(raw.shipping),
      tax: toNumber(raw.tax),
      grandTotal: toNumber(raw.total),
    },
  };
}

/**
 * Builds the safe payment payload for the API. CVV and the full card number
 * never leave the browser — only display data is sent.
 */
function toSafePayment(payment: PaymentFormData): OrderPayment {
  if (payment.method === 'card') {
    const digits = payment.card.cardNumber.replace(/\D/g, '');
    return {
      method: 'card',
      last4: digits.slice(-4) || '0000',
      ...(payment.card.cardName.trim() ? { cardName: payment.card.cardName.trim() } : {}),
    };
  }
  if (payment.method === 'upi') {
    return { method: 'upi', upiId: payment.upiId.trim() };
  }
  return { method: 'cod' };
}

/**
 * Places an order with the backend. The server validates products, checks
 * stock, recalculates all totals from current database prices, generates
 * the order number, and persists everything in a transaction. The returned
 * order (with server pricing) is the single source of truth.
 */
export async function placeOrder(params: {
  items: CartItem[];
  shipping: ShippingFormData;
  payment: PaymentFormData;
}): Promise<Order> {
  const order = await api.post<Record<string, unknown>>('/orders', {
    items: params.items.map(i => ({ productId: i.id, quantity: i.quantity })),
    shipping: params.shipping,
    payment: toSafePayment(params.payment),
  });
  const sanitized = sanitizeOrder(order);
  if (!sanitized) throw new Error('The server returned an unreadable order');
  return sanitized;
}

/** Loads the order history for this browser (anonymous client scoping). */
export async function getOrders(): Promise<Order[]> {
  const raw = await api.get<unknown[]>('/orders');
  if (!Array.isArray(raw)) return [];
  return raw.map(sanitizeOrder).filter((o): o is Order => o !== null);
}

/** Loads a single order by its server-generated number. */
export async function getOrderById(id: string): Promise<Order | null> {
  const raw = await api.get<unknown>(`/orders/${encodeURIComponent(id)}`);
  return sanitizeOrder(raw);
}

/** Estimated delivery window (in calendar days) for an order. */
export function estimateDeliveryRange(createdAtIso: string): { from: Date; to: Date } {
  const placed = new Date(createdAtIso);
  const from = new Date(placed);
  from.setDate(from.getDate() + DELIVERY_DAYS_MIN);
  const to = new Date(placed);
  to.setDate(to.getDate() + DELIVERY_DAYS_MAX);
  return { from, to };
}

function formatDay(date: Date): string {
  return date.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}

/** Formats the estimated delivery window, e.g. "Aug 18 – Aug 20, 2026". */
export function formatDeliveryRange(createdAtIso: string): string {
  const { from, to } = estimateDeliveryRange(createdAtIso);
  const year = to.getFullYear();
  return `${formatDay(from)} – ${formatDay(to)}, ${year}`;
}

export function formatOrderDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}
