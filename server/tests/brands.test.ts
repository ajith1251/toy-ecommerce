import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { closePool, type DbPool } from '../src/db/pool.js';
import { createTestContext, type TestContext } from './helpers.js';

let ctx: TestContext;
let pool: DbPool;

beforeAll(async () => {
  ctx = await createTestContext();
  pool = ctx.pool;
});

afterAll(async () => {
  await closePool(pool);
});

describe('GET /api/brands', () => {
  it('lists all seeded brands alphabetically', async () => {
    const res = await request(ctx.app).get('/api/brands').expect(200);
    const names = res.body.data.map((b: { name: string }) => b.name);
    expect(names.length).toBeGreaterThan(50);
    expect(names).toEqual([...names].sort());
    expect(names).toContain('PlayTime');
  });

  it('returns a brand by slug', async () => {
    const res = await request(ctx.app).get('/api/brands/playtime').expect(200);
    expect(res.body.data.name).toBe('PlayTime');
  });

  it('returns 404 for an unknown brand', async () => {
    const res = await request(ctx.app).get('/api/brands/lego').expect(404);
    expect(res.body.error.code).toBe('not_found');
  });
});
