import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { closePool, type DbPool } from '../src/db/pool.js';
import { createTestContext, registerUser, type TestContext } from './helpers.js';

let ctx: TestContext;
let pool: DbPool;

beforeAll(async () => {
  ctx = await createTestContext();
  pool = ctx.pool;
});

afterAll(async () => {
  await closePool(pool);
});

/** Promotes a user to the admin role directly in the database. */
async function makeAdmin(email: string): Promise<void> {
  await pool.query('UPDATE users SET role = $1 WHERE lower(email) = lower($2)', ['admin', email]);
}

describe('admin route guards', () => {
  it('rejects anonymous access with 401', async () => {
    const res = await request(ctx.app).get('/api/admin/dashboard').expect(401);
    expect(res.body.error).toMatchObject({ code: 'unauthorized' });
  });

  it('rejects authenticated non-admin customers with 403', async () => {
    const { cookie } = await registerUser(ctx.app);
    const res = await request(ctx.app).get('/api/admin/dashboard').set('Cookie', cookie).expect(403);
    expect(res.body.error).toMatchObject({ code: 'forbidden' });
  });

  it('allows admins to read the dashboard KPIs', async () => {
    const { email, cookie } = await registerUser(ctx.app);
    await makeAdmin(email);

    const res = await request(ctx.app).get('/api/admin/dashboard').set('Cookie', cookie).expect(200);
    expect(res.body).toMatchObject({
      revenue: 0,
      orders: 0,
      customers: expect.any(Number),
      products: expect.any(Number),
      lowStock: expect.any(Number),
      pendingPayments: 0,
    });
  });

  it('still returns 404 for unknown non-admin routes (guards are scoped to /admin)', async () => {
    const { email, cookie } = await registerUser(ctx.app);
    await makeAdmin(email);
    await request(ctx.app).get('/api/definitely-not-a-route').set('Cookie', cookie).expect(404);
  });
});

describe('admin product management', () => {
  it('lists products with pagination metadata', async () => {
    const { email, cookie } = await registerUser(ctx.app);
    await makeAdmin(email);

    const res = await request(ctx.app)
      .get('/api/admin/products?limit=5&page=1')
      .set('Cookie', cookie)
      .expect(200);

    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeLessThanOrEqual(5);
    expect(res.body.pagination).toMatchObject({ page: 1, limit: 5 });
    expect(res.body.data[0]).toMatchObject({ id: expect.any(Number), name: expect.any(String) });
  });

  it('creates, updates and soft-deletes a product', async () => {
    const { email, cookie } = await registerUser(ctx.app);
    await makeAdmin(email);
    const auth = { Cookie: cookie };

    // Pick an existing category/brand to satisfy the FKs.
    const cat = await pool.query('SELECT id FROM categories ORDER BY id LIMIT 1');
    const brand = await pool.query('SELECT id FROM brands ORDER BY id LIMIT 1');

    const created = await request(ctx.app)
      .post('/api/admin/products')
      .set(auth)
      .send({
        name: 'Admin Test Toy',
        slug: `admin-test-toy-${Date.now()}`,
        description: 'Created by the admin test suite',
        price: 19.99,
        categoryId: cat.rows[0].id,
        brandId: brand.rows[0].id,
        ageGroup: 'kids',
        ageRange: '3-5',
        stockQuantity: 7,
      })
      .expect(201);

    const productId = created.body.data.id;
    expect(created.body.data).toMatchObject({ name: 'Admin Test Toy', price: 19.99, inStock: true });

    const updated = await request(ctx.app)
      .patch(`/api/admin/products/${productId}`)
      .set(auth)
      .send({ price: 24.99, stockQuantity: 3 })
      .expect(200);
    expect(updated.body.data).toMatchObject({ price: 24.99, stockQuantity: 3 });

    await request(ctx.app).delete(`/api/admin/products/${productId}`).set(auth).expect(200);

    const refetched = await request(ctx.app).get(`/api/admin/products/${productId}`).set(auth).expect(200);
    expect(refetched.body.data.inStock).toBe(false); // soft-deleted
  });

  it('validates the inventory adjustment payload and refuses negative stock', async () => {
    const { email, cookie } = await registerUser(ctx.app);
    await makeAdmin(email);
    const auth = { Cookie: cookie };

    const product = await pool.query(
      'SELECT id, stock_quantity FROM products WHERE is_active = true ORDER BY id LIMIT 1'
    );
    const productId = product.rows[0].id;

    // Invalid body → validation error
    await request(ctx.app)
      .post(`/api/admin/inventory/${productId}/adjust`)
      .set(auth)
      .send({ quantityDelta: 1.5, reason: '' })
      .expect(400);

    // Removing more than available → 409 insufficient_stock
    const res = await request(ctx.app)
      .post(`/api/admin/inventory/${productId}/adjust`)
      .set(auth)
      .send({ quantityDelta: -(product.rows[0].stock_quantity + 100), reason: 'test' })
      .expect(409);
    expect(res.body.error.code).toBe('insufficient_stock');
  });

  it('applies a valid inventory adjustment and records the transaction', async () => {
    const { email, cookie } = await registerUser(ctx.app);
    await makeAdmin(email);
    const auth = { Cookie: cookie };

    const product = await pool.query('SELECT id, stock_quantity FROM products ORDER BY id LIMIT 1');
    const productId = product.rows[0].id;

    const res = await request(ctx.app)
      .post(`/api/admin/inventory/${productId}/adjust`)
      .set(auth)
      .send({ quantityDelta: 5, reason: 'restock', referenceType: 'purchase' })
      .expect(200);

    expect(res.body.data).toMatchObject({
      productId,
      quantityDelta: 5,
      previousStock: product.rows[0].stock_quantity,
      newStock: product.rows[0].stock_quantity + 5,
    });

    const tx = await pool.query(
      'SELECT change_quantity, reason FROM inventory_transactions WHERE product_id = $1 ORDER BY id DESC LIMIT 1',
      [productId]
    );
    expect(tx.rows[0]).toMatchObject({ change_quantity: 5, reason: 'restock' });
  });
});

describe('admin order status transitions', () => {
  it('moves an order through valid transitions and rejects invalid ones', async () => {
    const { email, cookie } = await registerUser(ctx.app);
    await makeAdmin(email);
    const auth = { Cookie: cookie };

    // Create an order through the public API.
    const product = await pool.query(
      'SELECT id, price, stock_quantity FROM products WHERE is_active = true AND stock_quantity > 3 ORDER BY id LIMIT 1'
    );
    const placed = await request(ctx.app)
      .post('/api/orders')
      .set({ ...auth, 'X-Client-Id': 'admin-test-client' })
      .send({
        items: [{ productId: product.rows[0].id, quantity: 1 }],
        shipping: {
          firstName: 'Jane',
          lastName: 'Doe',
          email: 'jane@example.com',
          phone: '+1 555 123 4567',
          line1: '123 Toy Lane',
          line2: '',
          city: 'Springfield',
          state: 'CA',
          postalCode: '90210',
          country: 'United States',
        },
        payment: { method: 'cod' },
      })
      .expect(201);
    const orderNumber = placed.body.data.id;

    // confirmed → shipped is not allowed directly.
    await request(ctx.app)
      .patch(`/api/admin/orders/${orderNumber}/status`)
      .set(auth)
      .send({ status: 'shipped' })
      .expect(400);

    // confirmed → paid → shipped → delivered follows the state machine.
    for (const status of ['paid', 'shipped', 'delivered']) {
      await request(ctx.app)
        .patch(`/api/admin/orders/${orderNumber}/status`)
        .set(auth)
        .send({ status })
        .expect(200);
    }

    // delivered is final.
    await request(ctx.app)
      .patch(`/api/admin/orders/${orderNumber}/status`)
      .set(auth)
      .send({ status: 'cancelled' })
      .expect(400);

    // The audit trail recorded every transition.
    const logs = await pool.query(
      "SELECT COUNT(*)::int AS n FROM admin_audit_logs WHERE action = 'update_order_status' AND entity_id = $1",
      [orderNumber]
    );
    expect(logs.rows[0].n).toBe(3);
  });

  it('validates the customer status payload against the text column', async () => {
    const { email, cookie } = await registerUser(ctx.app);
    await makeAdmin(email);
    const auth = { Cookie: cookie };

    const customer = await registerUser(ctx.app);
    const row = await pool.query('SELECT id FROM users WHERE lower(email) = lower($1)', [customer.email]);
    const customerId = row.rows[0].id;

    // Boolean payloads are no longer accepted — the users.status column is text.
    await request(ctx.app)
      .patch(`/api/admin/customers/${customerId}/status`)
      .set(auth)
      .send({ status: true })
      .expect(400);

    await request(ctx.app)
      .patch(`/api/admin/customers/${customerId}/status`)
      .set(auth)
      .send({ status: 'suspended' })
      .expect(200);

    const after = await pool.query('SELECT status FROM users WHERE id = $1', [customerId]);
    expect(after.rows[0].status).toBe('suspended');
  });
});
