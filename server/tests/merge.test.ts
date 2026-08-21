import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { closePool, type DbPool } from '../src/db/pool.js';
import {
  createTestContext,
  registerUser,
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

function guestAuth() {
  return { 'x-client-id': TEST_CLIENT_ID };
}

describe('POST /api/auth/merge', () => {
  it('merges a guest server cart and localStorage items into the account cart', async () => {
    // Guest adds product 1 × 2 to the server cart (as if via the API).
    await request(ctx.app).post('/api/cart/items').set(guestAuth()).send({ productId: 1, quantity: 2 }).expect(201);

    const { cookie } = await registerUser(ctx.app);
    // The frontend supplies localStorage items too (product 2 × 1).
    const res = await request(ctx.app)
      .post('/api/auth/merge')
      .set('Cookie', cookie)
      .set(guestAuth())
      .send({ cartItems: [{ productId: 2, quantity: 1 }], wishlistIds: [3] })
      .expect(200);

    const byProduct = new Map(res.body.data.cart.map((i: { productId: number; quantity: number }) => [i.productId, i.quantity]));
    expect(byProduct.get(1)).toBe(2);
    expect(byProduct.get(2)).toBe(1);
    expect(res.body.data.wishlist).toContain(3);

    // Guest cart is retired.
    const guestCart = await request(ctx.app).get('/api/cart').set(guestAuth()).expect(200);
    expect(guestCart.body.data).toEqual([]);
  });

  it('adds guest quantities to an existing account cart (deterministic merge)', async () => {
    await request(ctx.app).post('/api/cart/items').set(guestAuth()).send({ productId: 1, quantity: 2 }).expect(201);

    const { cookie } = await registerUser(ctx.app);
    await request(ctx.app).post('/api/cart/items').set('Cookie', cookie).set(guestAuth()).send({ productId: 1, quantity: 1 }).expect(201);
    await request(ctx.app).post('/api/cart/items').set('Cookie', cookie).set(guestAuth()).send({ productId: 4, quantity: 3 }).expect(201);

    const res = await request(ctx.app)
      .post('/api/auth/merge')
      .set('Cookie', cookie)
      .set(guestAuth())
      .send({ cartItems: [], wishlistIds: [] })
      .expect(200);

    const byProduct = new Map(res.body.data.cart.map((i: { productId: number; quantity: number }) => [i.productId, i.quantity]));
    expect(byProduct.get(1)).toBe(3); // 2 guest + 1 account
    expect(byProduct.get(4)).toBe(3);
  });

  it('caps merged quantities at available stock and reports the caps', async () => {
    const stock = await pool.query('SELECT stock_quantity FROM products WHERE id = 1');
    const available = stock.rows[0]?.stock_quantity as number;

    await request(ctx.app).post('/api/cart/items').set(guestAuth()).send({ productId: 1, quantity: available + 10 }).expect(201);

    const { cookie } = await registerUser(ctx.app);
    const res = await request(ctx.app)
      .post('/api/auth/merge')
      .set('Cookie', cookie)
      .set(guestAuth())
      .send({ cartItems: [], wishlistIds: [] })
      .expect(200);

    const item = res.body.data.cart.find((i: { productId: number }) => i.productId === 1);
    expect(item.quantity).toBe(available);
    expect(res.body.data.capped).toEqual([{ productId: 1, requested: available + 10, capped: available }]);
  });

  it('unions guest and account wishlists without duplicates', async () => {
    await request(ctx.app).post('/api/wishlist/items/1').set(guestAuth()).expect(201);
    await request(ctx.app).post('/api/wishlist/items/2').set(guestAuth()).expect(201);

    const { cookie } = await registerUser(ctx.app);
    await request(ctx.app).post('/api/wishlist/items/2').set('Cookie', cookie).set(guestAuth()).expect(201);

    const res = await request(ctx.app)
      .post('/api/auth/merge')
      .set('Cookie', cookie)
      .set(guestAuth())
      .send({ cartItems: [], wishlistIds: [3] })
      .expect(200);

    expect(new Set(res.body.data.wishlist)).toEqual(new Set([1, 2, 3]));
  });

  it('claims same-browser anonymous orders for the account', async () => {
    const guestOrder = await request(ctx.app)
      .post('/api/orders')
      .set(guestAuth())
      .send({ items: [{ productId: 1, quantity: 1 }], shipping: validShipping(), payment: { method: 'cod' } })
      .expect(201);

    const { cookie } = await registerUser(ctx.app);
    await request(ctx.app).post('/api/auth/merge').set('Cookie', cookie).set(guestAuth()).send({ cartItems: [], wishlistIds: [] }).expect(200);

    const orders = await request(ctx.app).get('/api/orders').set('Cookie', cookie).set(guestAuth()).expect(200);
    expect(orders.body.data.map((o: { id: string }) => o.id)).toContain(guestOrder.body.data.id);

    // The guest client no longer sees it (claimed by the account).
    const guestOrders = await request(ctx.app).get('/api/orders').set(guestAuth()).expect(200);
    expect(guestOrders.body.data).toEqual([]);
  });

  it('requires authentication and a client id', async () => {
    await request(ctx.app).post('/api/auth/merge').send({ cartItems: [], wishlistIds: [] }).expect(401);

    const { cookie } = await registerUser(ctx.app);
    await request(ctx.app).post('/api/auth/merge').set('Cookie', cookie).send({ cartItems: [], wishlistIds: [] }).expect(400);
  });

  it('ignores unknown product ids gracefully', async () => {
    const { cookie } = await registerUser(ctx.app);
    const res = await request(ctx.app)
      .post('/api/auth/merge')
      .set('Cookie', cookie)
      .set(guestAuth())
      .send({ cartItems: [{ productId: 999999, quantity: 2 }], wishlistIds: [999999] })
      .expect(200);
    expect(res.body.data.cart).toEqual([]);
    expect(res.body.data.wishlist).toEqual([]);
  });
});
