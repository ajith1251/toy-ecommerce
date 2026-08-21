import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { closePool, type DbPool } from '../src/db/pool.js';
import {
  createTestContext,
  registerUser,
  resetTransactionalData,
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
    items: [{ productId: 1, quantity: 1 }],
    shipping: validShipping(),
    payment: { method: 'cod' },
    ...overrides,
  };
}

const CLIENT = { 'x-client-id': 'test-client-00000001' };

async function makeUsers() {
  const a = await registerUser(ctx.app);
  const b = await registerUser(ctx.app);
  return { a, b };
}

async function placeOrderAs(cookie: string) {
  const res = await request(ctx.app)
    .post('/api/orders')
    .set('Cookie', cookie)
    .set(CLIENT)
    .send(orderBody())
    .expect(201);
  return res.body.data.id as string;
}

describe('order ownership isolation', () => {
  it('user A sees only A’s orders; user B never sees A’s orders', async () => {
    const { a, b } = await makeUsers();
    await placeOrderAs(a.cookie);
    await placeOrderAs(a.cookie);

    const aOrders = await request(ctx.app).get('/api/orders').set('Cookie', a.cookie).set(CLIENT).expect(200);
    expect(aOrders.body.data).toHaveLength(2);

    const bOrders = await request(ctx.app).get('/api/orders').set('Cookie', b.cookie).set(CLIENT).expect(200);
    expect(bOrders.body.data).toEqual([]);
  });

  it('user B cannot read user A’s order by number', async () => {
    const { a, b } = await makeUsers();
    const orderId = await placeOrderAs(a.cookie);

    const res = await request(ctx.app).get(`/api/orders/${orderId}`).set('Cookie', b.cookie).set(CLIENT).expect(404);
    expect(res.body.error.code).toBe('not_found');

    // A can still read it.
    await request(ctx.app).get(`/api/orders/${orderId}`).set('Cookie', a.cookie).set(CLIENT).expect(200);
  });

  it('a forged userId in the body has no effect — ownership comes from the session', async () => {
    const { a, b } = await makeUsers();
    const orderId = await placeOrderAs(a.cookie);
    // Even if B guessed A's user id and sent it, the session wins.
    const res = await request(ctx.app)
      .get(`/api/orders/${orderId}`)
      .set('Cookie', b.cookie)
      .set(CLIENT)
      .send({ userId: 1 })
      .expect(404);
    expect(res.body.error.code).toBe('not_found');
  });

  it('stores the owning user id on authenticated orders', async () => {
    const { a } = await makeUsers();
    await placeOrderAs(a.cookie);
    const rows = await pool.query('SELECT user_id, client_id FROM orders');
    expect(rows.rows[0]?.user_id).toBeTruthy();
    expect(rows.rows[0]?.client_id).toBeTruthy();
  });
});

describe('cart ownership isolation', () => {
  it('user A and user B have separate carts', async () => {
    const { a, b } = await makeUsers();
    await request(ctx.app).post('/api/cart/items').set('Cookie', a.cookie).set(CLIENT).send({ productId: 1, quantity: 2 }).expect(201);

    const aCart = await request(ctx.app).get('/api/cart').set('Cookie', a.cookie).set(CLIENT).expect(200);
    expect(aCart.body.data).toHaveLength(1);
    expect(aCart.body.data[0].productId).toBe(1);
    expect(aCart.body.data[0].quantity).toBe(2);

    const bCart = await request(ctx.app).get('/api/cart').set('Cookie', b.cookie).set(CLIENT).expect(200);
    expect(bCart.body.data).toEqual([]);
  });

  it('user B cannot modify user A’s cart via product id', async () => {
    const { a, b } = await makeUsers();
    await request(ctx.app).post('/api/cart/items').set('Cookie', a.cookie).set(CLIENT).send({ productId: 1, quantity: 2 }).expect(201);

    await request(ctx.app).delete('/api/cart/items/1').set('Cookie', b.cookie).set(CLIENT).expect(200);

    const aCart = await request(ctx.app).get('/api/cart').set('Cookie', a.cookie).set(CLIENT).expect(200);
    expect(aCart.body.data).toHaveLength(1); // untouched
  });
});

describe('wishlist ownership isolation', () => {
  it('user A and user B have separate wishlists', async () => {
    const { a, b } = await makeUsers();
    await request(ctx.app).post('/api/wishlist/items/1').set('Cookie', a.cookie).set(CLIENT).expect(201);

    const aWishlist = await request(ctx.app).get('/api/wishlist').set('Cookie', a.cookie).set(CLIENT).expect(200);
    expect(aWishlist.body.data.map((p: { id: number }) => p.id)).toContain(1);

    const bWishlist = await request(ctx.app).get('/api/wishlist').set('Cookie', b.cookie).set(CLIENT).expect(200);
    expect(bWishlist.body.data).toEqual([]);
  });

  it('user B cannot remove from user A’s wishlist', async () => {
    const { a, b } = await makeUsers();
    await request(ctx.app).post('/api/wishlist/items/1').set('Cookie', a.cookie).set(CLIENT).expect(201);
    await request(ctx.app).delete('/api/wishlist/items/1').set('Cookie', b.cookie).set(CLIENT).expect(200);

    const aWishlist = await request(ctx.app).get('/api/wishlist').set('Cookie', a.cookie).set(CLIENT).expect(200);
    expect(aWishlist.body.data.map((p: { id: number }) => p.id)).toContain(1);
  });
});

describe('address ownership isolation', () => {
  async function createAddressAs(cookie: string) {
    return request(ctx.app)
      .post('/api/account/addresses')
      .set('Cookie', cookie)
      .send({
        label: 'Home',
        firstName: 'Test',
        lastName: 'User',
        line1: '123 Toy Lane',
        city: 'Springfield',
        postalCode: '90210',
        country: 'United States',
      })
      .expect(201);
  }

  it('user B cannot read or modify user A’s addresses', async () => {
    const { a, b } = await makeUsers();
    const created = await createAddressAs(a.cookie);
    const addressId = created.body.data.address.id as number;

    const bList = await request(ctx.app).get('/api/account/addresses').set('Cookie', b.cookie).expect(200);
    expect(bList.body.data.addresses).toEqual([]);

    await request(ctx.app)
      .patch(`/api/account/addresses/${addressId}`)
      .set('Cookie', b.cookie)
      .send({ label: 'Hacked', line1: '999 Evil St', city: 'Nowhere', postalCode: '00000' })
      .expect(404);

    await request(ctx.app).delete(`/api/account/addresses/${addressId}`).set('Cookie', b.cookie).expect(404);

    const aList = await request(ctx.app).get('/api/account/addresses').set('Cookie', a.cookie).expect(200);
    expect(aList.body.data.addresses).toHaveLength(1);
    expect(aList.body.data.addresses[0].label).toBe('Home');
  });
});
