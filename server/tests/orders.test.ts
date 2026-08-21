import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { closePool, type DbPool } from '../src/db/pool.js';
import {
  createTestContext,
  resetTransactionalData,
  TEST_CLIENT_ID,
  validShipping,
  type TestContext,
} from './helpers.js';

let ctx: TestContext;
let pool: DbPool;

beforeAll(async () => {
  ctx = await createTestContext();
  pool = ctx.pool;
});

beforeEach(async () => {
  await resetTransactionalData(pool);
});

afterAll(async () => {
  await closePool(pool);
});

function orderBody(overrides: Record<string, unknown> = {}) {
  return {
    items: [{ productId: 1, quantity: 2 }],
    shipping: validShipping(),
    payment: { method: 'card', last4: '4242', cardName: 'Jane Doe' },
    ...overrides,
  };
}

function auth() {
  return { 'x-client-id': TEST_CLIENT_ID };
}

describe('POST /api/orders', () => {
  it('creates an order with server-generated number and server-calculated totals', async () => {
    const res = await request(ctx.app).post('/api/orders').set(auth()).send(orderBody()).expect(201);
    const order = res.body.data;

    expect(order.id).toMatch(/^TBX-\d{8}-[0-9A-Z]{6}$/);
    expect(order.status).toBe('confirmed');
    expect(order.customer.firstName).toBe('Jane');
    expect(order.shippingAddress.city).toBe('Springfield');

    // Server pricing for product 1 (34.99) × 2 → 69.98 ≥ free-shipping threshold.
    expect(order.pricing).toEqual({
      subtotal: 69.98,
      discount: 0,
      shipping: 0,
      tax: 5.6,
      grandTotal: 75.58,
    });
    expect(order.items).toEqual([
      expect.objectContaining({ id: 1, name: 'Hero Squad Action Pack', quantity: 2, price: 34.99 }),
    ]);
  });

  it('charges shipping below the free-shipping threshold', async () => {
    // Product 3 (49.99) × 1 → subtotal 49.99 < 50 → flat shipping fee.
    const res = await request(ctx.app)
      .post('/api/orders')
      .set(auth())
      .send(orderBody({ items: [{ productId: 3, quantity: 1 }] }))
      .expect(201);
    expect(res.body.data.pricing).toEqual({
      subtotal: 49.99,
      discount: 0,
      shipping: 5.99,
      tax: 4.0,
      grandTotal: 59.98,
    });
  });

  it('uses the current database price, not any client-supplied figure', async () => {
    const res = await request(ctx.app)
      .post('/api/orders')
      .set(auth())
      .send(orderBody({ items: [{ productId: 1, quantity: 1 }] }))
      .expect(201);
    expect(res.body.data.items[0].price).toBe(34.99);
    expect(res.body.data.pricing.subtotal).toBe(34.99);
  });

  it('rejects client-supplied totals and extra fields', async () => {
    const res = await request(ctx.app)
      .post('/api/orders')
      .set(auth())
      .send(orderBody({ grandTotal: 0.01, price: 1, discount: 999 }))
      .expect(400);
    expect(res.body.error.code).toBe('validation');
  });

  it('returns 404 for an unknown product', async () => {
    const res = await request(ctx.app)
      .post('/api/orders')
      .set(auth())
      .send(orderBody({ items: [{ productId: 999999, quantity: 1 }] }))
      .expect(404);
    expect(res.body.error.code).toBe('not_found');
  });

  it('returns 400 for invalid quantities', async () => {
    for (const quantity of [0, -2, 100, 1.5]) {
      const res = await request(ctx.app)
        .post('/api/orders')
        .set(auth())
        .send(orderBody({ items: [{ productId: 1, quantity }] }))
        .expect(400);
      expect(res.body.error.code).toBe('validation');
    }
  });

  it('returns 400 for an empty order', async () => {
    await request(ctx.app).post('/api/orders').set(auth()).send(orderBody({ items: [] })).expect(400);
  });

  it('returns 400 for invalid shipping and payment', async () => {
    await request(ctx.app)
      .post('/api/orders')
      .set(auth())
      .send(orderBody({ shipping: validShipping({ email: 'not-an-email' }) }))
      .expect(400);
    await request(ctx.app)
      .post('/api/orders')
      .set(auth())
      .send(orderBody({ payment: { method: 'card', last4: '12' } }))
      .expect(400);
    await request(ctx.app)
      .post('/api/orders')
      .set(auth())
      .send(orderBody({ payment: { method: 'crypto' } }))
      .expect(400);
  });

  it('returns 400 without an X-Client-Id header', async () => {
    const res = await request(ctx.app).post('/api/orders').send(orderBody()).expect(400);
    expect(res.body.error.code).toBe('validation');
  });

  it('blocks placement when stock is insufficient and rolls back', async () => {
    // Product 1 seeded stock = 32.
    const stockBefore = await pool.query('SELECT stock_quantity FROM products WHERE id = 1');
    const available = stockBefore.rows[0]?.stock_quantity as number;

    const res = await request(ctx.app)
      .post('/api/orders')
      .set(auth())
      .send(orderBody({ items: [{ productId: 1, quantity: available + 1 }] }))
      .expect(409);
    expect(res.body.error.code).toBe('insufficient_stock');

    const stockAfter = await pool.query('SELECT stock_quantity FROM products WHERE id = 1');
    expect(stockAfter.rows[0]?.stock_quantity).toBe(available);

    const orders = await pool.query('SELECT count(*)::int AS count FROM orders');
    expect(orders.rows[0]?.count).toBe(0);
  });

  it('decrements stock atomically with the order', async () => {
    const before = await pool.query('SELECT stock_quantity FROM products WHERE id = 1');
    await request(ctx.app).post('/api/orders').set(auth()).send(orderBody()).expect(201);
    const after = await pool.query('SELECT stock_quantity FROM products WHERE id = 1');
    expect((before.rows[0]?.stock_quantity as number) - (after.rows[0]?.stock_quantity as number)).toBe(2);
  });

  it('blocks placement when two attempts together exceed stock', async () => {
    // Product 3 stock = 25 + (3*7)%70 = 46. Two orders of 30 each: first succeeds, second fails.
    const body = orderBody({ items: [{ productId: 3, quantity: 30 }] });
    await request(ctx.app).post('/api/orders').set(auth()).send(body).expect(201);
    const res = await request(ctx.app).post('/api/orders').set(auth()).send(body).expect(409);
    expect(res.body.error.code).toBe('insufficient_stock');
  });

  it('stores only a safe payment snapshot — never CVV or full card numbers', async () => {
    await request(ctx.app).post('/api/orders').set(auth()).send(orderBody()).expect(201);

    const rows = await pool.query('SELECT payment FROM orders');
    const payment = rows.rows[0]?.payment as Record<string, unknown>;
    // Per spec §13: card orders store last4 only — no cardholder name either.
    expect(payment).toEqual({ method: 'card', last4: '4242' });
    expect(JSON.stringify(payment).toLowerCase()).not.toContain('cvv');
    expect(JSON.stringify(payment)).not.toContain('4242424242424242');
    expect(JSON.stringify(payment)).not.toContain('jane doe');
  });

  it('stores UPI and COD snapshots without card data', async () => {
    await request(ctx.app)
      .post('/api/orders')
      .set(auth())
      .send(orderBody({ payment: { method: 'upi', upiId: 'jane@bank' } }))
      .expect(201);
    await request(ctx.app)
      .post('/api/orders')
      .set(auth())
      .send(orderBody({ payment: { method: 'cod' } }))
      .expect(201);

    const rows = await pool.query('SELECT payment FROM orders ORDER BY id');
    expect(rows.rows[0]?.payment).toEqual({ method: 'upi', upiId: 'jane@bank' });
    expect(rows.rows[1]?.payment).toEqual({ method: 'cod' });
  });

  it('generates unique order numbers across orders', async () => {
    const ids = new Set<string>();
    for (let i = 0; i < 3; i++) {
      const res = await request(ctx.app)
        .post('/api/orders')
        .set(auth())
        .send(orderBody({ items: [{ productId: 1, quantity: 1 }] }))
        .expect(201);
      ids.add(res.body.data.id);
    }
    expect(ids.size).toBe(3);
    for (const id of ids) expect(id).toMatch(/^TBX-\d{8}-[0-9A-Z]{6}$/);
  });

  it('merges duplicate product lines into a single order item', async () => {
    const res = await request(ctx.app)
      .post('/api/orders')
      .set(auth())
      .send(orderBody({ items: [{ productId: 1, quantity: 1 }, { productId: 1, quantity: 2 }] }))
      .expect(201);
    expect(res.body.data.items).toHaveLength(1);
    expect(res.body.data.items[0].quantity).toBe(3);
  });
});

describe('GET /api/orders', () => {
  it('lists only orders belonging to the requesting client', async () => {
    await request(ctx.app).post('/api/orders').set(auth()).send(orderBody()).expect(201);

    const other = await request(ctx.app)
      .get('/api/orders')
      .set('x-client-id', 'another-client-0001')
      .expect(200);
    expect(other.body.data).toEqual([]);

    const mine = await request(ctx.app).get('/api/orders').set(auth()).expect(200);
    expect(mine.body.data).toHaveLength(1);
    expect(mine.body.data[0].id).toMatch(/^TBX-/);
  });
});

describe('GET /api/orders/:orderNumber', () => {
  it('returns a persisted order with its item snapshot', async () => {
    const created = await request(ctx.app).post('/api/orders').set(auth()).send(orderBody()).expect(201);
    const res = await request(ctx.app)
      .get(`/api/orders/${created.body.data.id}`)
      .set(auth())
      .expect(200);
    expect(res.body.data.id).toBe(created.body.data.id);
    expect(res.body.data.items[0]).toMatchObject({ name: 'Hero Squad Action Pack', quantity: 2 });
    expect(res.body.data.customer.email).toBe('jane@example.com');
  });

  it('returns 404 for an unknown order number', async () => {
    await request(ctx.app).get('/api/orders/TBX-20260101-NOPE00').set(auth()).expect(404);
  });

  it('does not leak another client’s order', async () => {
    const created = await request(ctx.app).post('/api/orders').set(auth()).send(orderBody()).expect(201);
    await request(ctx.app)
      .get(`/api/orders/${created.body.data.id}`)
      .set('x-client-id', 'another-client-0001')
      .expect(404);
  });
});
