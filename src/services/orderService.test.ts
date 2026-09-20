import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '../lib/api/errors';
import { makeCartItem, makeOrder } from '../test/fixtures';
import type { PaymentFormData, ShippingFormData } from '../types/checkout';
import type { Order } from '../types/order';
import {
  estimateDeliveryRange,
  formatDeliveryRange,
  getOrderById,
  getOrders,
  placeOrder,
  sanitizeOrder,
} from './orderService';
import { emptyPayment, emptyShipping } from './checkoutService';

vi.mock('../lib/api/client', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

import { api } from '../lib/api/client';

const mockedGet = vi.mocked(api.get);
const mockedPost = vi.mocked(api.post);

const shipping: ShippingFormData = {
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

function cardPayment(): PaymentFormData {
  const payment = emptyPayment();
  payment.card.cardName = 'Jane Doe';
  payment.card.cardNumber = '4242 4242 4242 4242';
  payment.card.expiry = '12/30';
  payment.card.cvv = '123';
  return payment;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('placeOrder (POST /orders)', () => {
  it('sends item ids + quantities only and returns the server order', async () => {
    const serverOrder = makeOrder({ items: [makeCartItem(1, 29.99, 2)] });
    mockedPost.mockResolvedValue(serverOrder);

    const order = await placeOrder({ items: [makeCartItem(1, 29.99, 2)], shipping, payment: cardPayment() });

    expect(mockedPost).toHaveBeenCalledTimes(1);
    expect(mockedPost).toHaveBeenCalledWith('/orders', {
      items: [{ productId: 1, quantity: 2 }],
      shipping,
      payment: { method: 'card', last4: '4242', cardName: 'Jane Doe' },
    });
    expect(order.id).toBe(serverOrder.id);
    expect(order.pricing.grandTotal).toBe(serverOrder.pricing.grandTotal);
  });

  it('never sends CVV, the full card number or expiry', async () => {
    mockedPost.mockResolvedValue(makeOrder());

    await placeOrder({ items: [makeCartItem(1, 29.99, 1)], shipping, payment: cardPayment() });

    const payload = mockedPost.mock.calls[0]?.[1] as Record<string, unknown>;
    const payment = payload.payment as Record<string, unknown>;
    expect(payment).not.toHaveProperty('cvv');
    expect(payment).not.toHaveProperty('cardNumber');
    expect(payment).not.toHaveProperty('expiry');
    expect(JSON.stringify(payload)).not.toContain('4242 4242 4242 4242');
  });

  it('sends the UPI id for UPI payments', async () => {
    mockedPost.mockResolvedValue(makeOrder());
    const payment = cardPayment();
    payment.method = 'upi';
    payment.upiId = 'user@bank';

    await placeOrder({ items: [makeCartItem(1, 10, 1)], shipping, payment });

    const payload = mockedPost.mock.calls[0]?.[1] as { payment: Record<string, unknown> };
    expect(payload.payment).toEqual({ method: 'upi', upiId: 'user@bank' });
  });

  it('does not send a client id in the body (header-only)', async () => {
    mockedPost.mockResolvedValue(makeOrder());
    await placeOrder({ items: [makeCartItem(1, 10, 1)], shipping, payment: cardPayment() });
    const payload = mockedPost.mock.calls[0]?.[1] as Record<string, unknown>;
    expect(payload).not.toHaveProperty('clientId');
  });

  it('propagates API errors (e.g. insufficient stock)', async () => {
    mockedPost.mockRejectedValue(new ApiError('One or more items are no longer available', 409, 'insufficient_stock'));
    await expect(placeOrder({ items: [makeCartItem(1, 10, 1)], shipping, payment: cardPayment() })).rejects.toMatchObject({
      code: 'insufficient_stock',
      status: 409,
    });
  });

  it('throws when the server response is unreadable', async () => {
    mockedPost.mockResolvedValue({ nope: true });
    await expect(placeOrder({ items: [makeCartItem(1, 10, 1)], shipping, payment: cardPayment() })).rejects.toThrow(
      'unreadable order'
    );
  });
});

describe('getOrders (GET /orders)', () => {
  it('returns a sanitized order list from the API', async () => {
    const order = makeOrder({ id: 'TBX-20260817-ABCDEF' });
    mockedGet.mockResolvedValue([order, { garbage: true }, null]);

    const orders = await getOrders();
    expect(orders).toHaveLength(1);
    expect(orders[0]?.id).toBe('TBX-20260817-ABCDEF');
  });

  it('returns an empty list for a malformed payload', async () => {
    mockedGet.mockResolvedValue('not-an-array');
    expect(await getOrders()).toEqual([]);
  });

  it('propagates API errors', async () => {
    mockedGet.mockRejectedValue(new ApiError('Service unreachable', 0, 'network'));
    await expect(getOrders()).rejects.toMatchObject({ code: 'network' });
  });
});

describe('getOrderById (GET /orders/:id)', () => {
  it('returns a sanitized order', async () => {
    const order = makeOrder();
    mockedGet.mockResolvedValue(order);
    expect(await getOrderById(order.id)).toEqual(order);
  });

  it('returns null when the payload is malformed', async () => {
    mockedGet.mockResolvedValue({ bad: true });
    expect(await getOrderById('TBX-1')).toBeNull();
  });

  it('encodes the order number in the path', async () => {
    mockedGet.mockResolvedValue(makeOrder());
    await getOrderById('TBX-20260817-8F4K2M');
    expect(mockedGet).toHaveBeenCalledWith('/orders/TBX-20260817-8F4K2M');
  });
});

describe('sanitizeOrder', () => {
  it('passes valid new-shape orders through unchanged', () => {
    const order = makeOrder();
    expect(sanitizeOrder(order)).toEqual(order);
  });

  it('converts legacy Phase 1 orders', () => {
    const legacy = {
      id: 'TB-20250101-ABCD',
      date: '2026-01-01T00:00:00.000Z',
      status: 'confirmed',
      items: [{ id: 1, name: 'Toy', image: 'img', brand: 'Brand', price: 10, quantity: 2 }],
      subtotal: 20,
      shipping: 5.99,
      tax: 1.6,
      total: 27.59,
      shippingInfo: { fullName: 'Jane Doe', email: 'j@x.com', address: '1 St', city: 'C', state: 'S', zip: '12345', phone: '555' },
      paymentLast4: '4242',
    };

    const order = sanitizeOrder(legacy);
    expect(order?.customer.firstName).toBe('Jane');
    expect(order?.customer.lastName).toBe('Doe');
    expect(order?.shippingAddress.line1).toBe('1 St');
    expect(order?.shippingAddress.postalCode).toBe('12345');
    expect(order?.pricing.grandTotal).toBe(27.59);
    expect(order?.payment).toEqual({ method: 'card', last4: '4242' });
    expect(order?.items).toHaveLength(1);
  });

  it('returns null for garbage', () => {
    expect(sanitizeOrder(null)).toBeNull();
    expect(sanitizeOrder(42)).toBeNull();
    expect(sanitizeOrder({ id: 42 })).toBeNull();
    expect(sanitizeOrder({ id: 'x', shippingInfo: 'nope' })).toBeNull();
  });

  it('never retains CVV or full card numbers from a server payload', () => {
    const order: Order = makeOrder();
    (order as unknown as Record<string, unknown>).cvv = '123';
    (order.payment as unknown as Record<string, unknown>).cardNumber = '4242424242424242';
    const sanitized = sanitizeOrder(order);
    expect(JSON.stringify(sanitized)).not.toContain('cvv');
    expect(JSON.stringify(sanitized)).not.toContain('4242424242424242');
  });
});

describe('delivery estimation', () => {
  it('computes the configured day range', () => {
    const placed = new Date(2026, 7, 15, 10, 0, 0).toISOString();
    const { from, to } = estimateDeliveryRange(placed);
    expect(from.getDate() - new Date(placed).getDate()).toBe(3);
    expect(to.getDate() - new Date(placed).getDate()).toBe(5);
  });

  it('formats a readable delivery range', () => {
    const placed = new Date(2026, 7, 15, 10, 0, 0).toISOString();
    expect(formatDeliveryRange(placed)).toMatch(/^(?:\w{3} \d{1,2}|\d{1,2} \w{3}) – (?:\w{3} \d{1,2}|\d{1,2} \w{3}), \d{4}$/);
  });
});
