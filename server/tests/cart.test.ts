import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { closePool, type DbPool } from '../src/db/pool.js';
import {
  createTestContext,
  resetTransactionalData,
  TEST_CLIENT_ID,
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

const AUTH = { 'x-client-id': TEST_CLIENT_ID };

describe('GET /api/cart', () => {
  it('returns an empty cart for a new client', async () => {
    const res = await request(ctx.app).get('/api/cart').set(AUTH).expect(200);
    expect(res.body.data).toEqual([]);
  });

  it('requires a valid client id', async () => {
    await request(ctx.app).get('/api/cart').expect(400);
    await request(ctx.app).get('/api/cart').set('x-client-id', 'x').expect(400);
  });
});

describe('POST /api/cart/items', () => {
  it('adds an item with the current product snapshot', async () => {
    const res = await request(ctx.app)
      .post('/api/cart/items')
      .set(AUTH)
      .send({ productId: 1, quantity: 2 })
      .expect(201);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0]).toMatchObject({ productId: 1, quantity: 2 });
    expect(res.body.data[0].product).toMatchObject({ id: 1, name: 'Hero Squad Action Pack', price: 34.99 });
  });

  it('rejects unknown products', async () => {
    const res = await request(ctx.app)
      .post('/api/cart/items')
      .set(AUTH)
      .send({ productId: 999999, quantity: 1 })
      .expect(404);
    expect(res.body.error.code).toBe('not_found');
  });

  it('rejects invalid quantities', async () => {
    for (const quantity of [0, -1, 100]) {
      await request(ctx.app).post('/api/cart/items').set(AUTH).send({ productId: 1, quantity }).expect(400);
    }
  });
});

describe('PATCH /api/cart/items/:productId', () => {
  it('updates quantity', async () => {
    await request(ctx.app).post('/api/cart/items').set(AUTH).send({ productId: 1, quantity: 1 }).expect(201);
    const res = await request(ctx.app).patch('/api/cart/items/1').set(AUTH).send({ quantity: 5 }).expect(200);
    expect(res.body.data[0].quantity).toBe(5);
  });

  it('removes the item when quantity drops to zero', async () => {
    await request(ctx.app).post('/api/cart/items').set(AUTH).send({ productId: 1, quantity: 1 }).expect(201);
    const res = await request(ctx.app).patch('/api/cart/items/1').set(AUTH).send({ quantity: 0 }).expect(200);
    expect(res.body.data).toEqual([]);
  });

  it('rejects a quantity above the cap', async () => {
    await request(ctx.app).patch('/api/cart/items/1').set(AUTH).send({ quantity: 100 }).expect(400);
  });
});

describe('DELETE /api/cart/items/:productId and DELETE /api/cart', () => {
  it('removes a single item', async () => {
    await request(ctx.app).post('/api/cart/items').set(AUTH).send({ productId: 1 }).expect(201);
    const res = await request(ctx.app).delete('/api/cart/items/1').set(AUTH).expect(200);
    expect(res.body.data).toEqual([]);
  });

  it('clears the whole cart', async () => {
    await request(ctx.app).post('/api/cart/items').set(AUTH).send({ productId: 1 }).expect(201);
    await request(ctx.app).post('/api/cart/items').set(AUTH).send({ productId: 2 }).expect(201);
    const res = await request(ctx.app).delete('/api/cart').set(AUTH).expect(200);
    expect(res.body.data).toEqual([]);
  });
});

describe('cart persistence and isolation', () => {
  it('persists a cart across requests for the same client', async () => {
    await request(ctx.app).post('/api/cart/items').set(AUTH).send({ productId: 1, quantity: 3 }).expect(201);
    const res = await request(ctx.app).get('/api/cart').set(AUTH).expect(200);
    expect(res.body.data[0]).toMatchObject({ productId: 1, quantity: 3 });
  });

  it('isolates carts between clients', async () => {
    await request(ctx.app).post('/api/cart/items').set(AUTH).send({ productId: 1 }).expect(201);
    const other = await request(ctx.app)
      .get('/api/cart')
      .set('x-client-id', 'another-client-0001')
      .expect(200);
    expect(other.body.data).toEqual([]);
  });
});
