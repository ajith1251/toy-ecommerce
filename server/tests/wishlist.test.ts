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

describe('GET /api/wishlist', () => {
  it('starts empty', async () => {
    const res = await request(ctx.app).get('/api/wishlist').set(AUTH).expect(200);
    expect(res.body.data).toEqual([]);
  });
});

describe('POST /api/wishlist/items/:productId', () => {
  it('adds a product and returns the updated wishlist with product data', async () => {
    const res = await request(ctx.app).post('/api/wishlist/items/1').set(AUTH).expect(201);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0]).toMatchObject({ id: 1, name: 'Hero Squad Action Pack' });
  });

  it('is idempotent for duplicate adds', async () => {
    await request(ctx.app).post('/api/wishlist/items/1').set(AUTH).expect(201);
    await request(ctx.app).post('/api/wishlist/items/1').set(AUTH).expect(201);
    const res = await request(ctx.app).get('/api/wishlist').set(AUTH).expect(200);
    expect(res.body.data).toHaveLength(1);
  });

  it('rejects unknown products', async () => {
    const res = await request(ctx.app).post('/api/wishlist/items/999999').set(AUTH).expect(404);
    expect(res.body.error.code).toBe('not_found');
  });
});

describe('DELETE /api/wishlist/items/:productId', () => {
  it('removes a product', async () => {
    await request(ctx.app).post('/api/wishlist/items/1').set(AUTH).expect(201);
    await request(ctx.app).post('/api/wishlist/items/2').set(AUTH).expect(201);
    const res = await request(ctx.app).delete('/api/wishlist/items/1').set(AUTH).expect(200);
    const ids = res.body.data.map((p: { id: number }) => p.id);
    expect(ids).toEqual([2]);
  });
});

describe('wishlist isolation', () => {
  it('isolates wishlists between clients', async () => {
    await request(ctx.app).post('/api/wishlist/items/1').set(AUTH).expect(201);
    const other = await request(ctx.app)
      .get('/api/wishlist')
      .set('x-client-id', 'another-client-0001')
      .expect(200);
    expect(other.body.data).toEqual([]);
  });
});
