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

describe('GET /api/categories', () => {
  it('lists all seeded categories with the frontend CategoryInfo shape', async () => {
    const res = await request(ctx.app).get('/api/categories').expect(200);
    expect(res.body.data.length).toBeGreaterThan(50);
    const first = res.body.data[0] as Record<string, unknown>;
    expect(first).toMatchObject({
      id: 'action-figures',
      slug: 'action-figures',
      name: 'Action Figures',
      icon: expect.any(String),
      color: expect.any(String),
      ageGroup: expect.any(String),
    });
  });

  it('returns a category by slug', async () => {
    const res = await request(ctx.app).get('/api/categories/stem-toys').expect(200);
    expect(res.body.data.id).toBe('stem-toys');
    expect(res.body.data.name).toBe('STEM Toys');
  });

  it('returns 404 for an unknown category', async () => {
    const res = await request(ctx.app).get('/api/categories/does-not-exist').expect(404);
    expect(res.body.error.code).toBe('not_found');
  });
});
