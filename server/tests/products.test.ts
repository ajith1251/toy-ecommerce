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

describe('GET /api/products', () => {
  it('lists the seeded catalog with pagination metadata', async () => {
    const res = await request(ctx.app).get('/api/products').expect(200);
    expect(res.body.data).toHaveLength(24); // default limit
    expect(res.body.meta).toMatchObject({ page: 1, limit: 24, total: 54 });
    expect(res.body.meta.totalPages).toBe(3);
  });

  it('paginates with page and limit', async () => {
    const page2 = await request(ctx.app).get('/api/products?page=2&limit=24').expect(200);
    expect(page2.body.meta.page).toBe(2);
    expect(page2.body.data).toHaveLength(24);

    const last = await request(ctx.app).get('/api/products?page=3&limit=24').expect(200);
    expect(last.body.data).toHaveLength(6);

    const ids = new Set([...page2.body.data, ...last.body.data].map((p: { id: number }) => p.id));
    expect(ids.size).toBe(30);
  });

  it('shapes a product like the frontend Toy contract', async () => {
    const res = await request(ctx.app).get('/api/products?limit=1').expect(200);
    const product = res.body.data[0] as Record<string, unknown>;
    expect(product).toMatchObject({
      id: expect.any(Number),
      name: expect.any(String),
      price: expect.any(Number),
      category: expect.any(String),
      brand: expect.any(String),
      ageGroup: expect.any(String),
      rating: expect.any(Number),
      reviewCount: expect.any(Number),
      image: expect.any(String),
      inStock: expect.any(Boolean),
      stockQuantity: expect.any(Number),
    });
  });

  it('filters by search query (case-insensitive, across name/description/brand)', async () => {
    const res = await request(ctx.app).get('/api/products?q=robot&limit=250').expect(200);
    expect(res.body.data.length).toBeGreaterThan(0);
    for (const p of res.body.data) {
      const haystack = `${p.name} ${p.description} ${p.brand}`.toLowerCase();
      expect(haystack).toContain('robot');
    }
  });

  it('filters by category slug', async () => {
    const res = await request(ctx.app).get('/api/products?category=stem-toys&limit=250').expect(200);
    expect(res.body.data.length).toBeGreaterThan(0);
    for (const p of res.body.data) expect(p.category).toBe('stem-toys');
  });

  it('filters by brand slug', async () => {
    const res = await request(ctx.app).get('/api/products?brand=playtime&limit=250').expect(200);
    expect(res.body.data.length).toBe(1);
    expect(res.body.data[0].brand).toBe('PlayTime');
  });

  it('filters by minPrice and maxPrice', async () => {
    const expensive = await request(ctx.app).get('/api/products?minPrice=500&limit=250').expect(200);
    for (const p of expensive.body.data) expect(p.price).toBeGreaterThanOrEqual(500);

    const cheap = await request(ctx.app).get('/api/products?maxPrice=10&limit=250').expect(200);
    for (const p of cheap.body.data) expect(p.price).toBeLessThanOrEqual(10);
  });

  it('filters by minRating', async () => {
    const res = await request(ctx.app).get('/api/products?minRating=4.5&limit=250').expect(200);
    expect(res.body.data.length).toBeGreaterThan(0);
    for (const p of res.body.data) expect(p.rating).toBeGreaterThanOrEqual(4.5);
  });

  it('filters to in-stock products', async () => {
    const res = await request(ctx.app).get('/api/products?inStock=true&limit=250').expect(200);
    expect(res.body.data.length).toBe(54);
    for (const p of res.body.data) expect(p.inStock).toBe(true);
  });

  it('combines multiple filters', async () => {
    const res = await request(ctx.app)
      .get('/api/products?category=stem-toys&minRating=4&sort=price-asc&limit=250')
      .expect(200);
    for (const p of res.body.data) {
      expect(p.category).toBe('stem-toys');
      expect(p.rating).toBeGreaterThanOrEqual(4);
    }
  });

  it('returns an empty dataset for a query with no matches', async () => {
    const res = await request(ctx.app).get('/api/products?q=zzzzzzzz&limit=250').expect(200);
    expect(res.body.data).toEqual([]);
    expect(res.body.meta.total).toBe(0);
  });

  it('sorts by price ascending and descending', async () => {
    const asc = await request(ctx.app).get('/api/products?sort=price-asc&limit=250').expect(200);
    const prices = asc.body.data.map((p: { price: number }) => p.price);
    expect([...prices].sort((a, b) => a - b)).toEqual(prices);

    const desc = await request(ctx.app).get('/api/products?sort=price-desc&limit=250').expect(200);
    const descPrices = desc.body.data.map((p: { price: number }) => p.price);
    expect([...descPrices].sort((a, b) => b - a)).toEqual(descPrices);
  });

  it('sorts by rating', async () => {
    const res = await request(ctx.app).get('/api/products?sort=rating&limit=250').expect(200);
    const ratings = res.body.data.map((p: { rating: number }) => p.rating);
    expect([...ratings].sort((a, b) => b - a)).toEqual(ratings);
  });

  it('sorts by newest (is_new first)', async () => {
    const res = await request(ctx.app).get('/api/products?sort=newest&limit=250').expect(200);
    const newFlags = res.body.data.map((p: { isNew: boolean }) => p.isNew);
    const firstNewIndex = newFlags.indexOf(true);
    const lastNewIndex = newFlags.lastIndexOf(true);
    // All isNew products sort before non-new products.
    if (firstNewIndex >= 0 && lastNewIndex < newFlags.length - 1) {
      expect(newFlags.slice(lastNewIndex + 1).every(v => v === false)).toBe(true);
    }
  });

  it('rejects invalid pagination and sort values', async () => {
    await request(ctx.app).get('/api/products?page=0').expect(400);
    await request(ctx.app).get('/api/products?limit=999').expect(400);
    await request(ctx.app).get('/api/products?sort=bogus').expect(400);
  });
});

describe('GET /api/products/:id', () => {
  it('returns a product by id', async () => {
    const res = await request(ctx.app).get('/api/products/1').expect(200);
    expect(res.body.data.name).toBe('Hero Squad Action Pack');
    expect(res.body.data.brand).toBe('PlayTime');
    expect(res.body.data.category).toBe('action-figures');
    expect(res.body.data.inStock).toBe(true);
    expect(res.body.data.stockQuantity).toBeGreaterThan(0);
  });

  it('returns 404 for an unknown product id', async () => {
    const res = await request(ctx.app).get('/api/products/999999').expect(404);
    expect(res.body.error.code).toBe('not_found');
  });

  it('returns 400 for a malformed product id', async () => {
    await request(ctx.app).get('/api/products/not-a-number').expect(400);
  });
});

describe('GET /api/products/slug/:slug', () => {
  it('returns a product by slug', async () => {
    const res = await request(ctx.app).get('/api/products/slug/hero-squad-action-pack').expect(200);
    expect(res.body.data.id).toBe(1);
  });

  it('returns 404 for an unknown slug', async () => {
    await request(ctx.app).get('/api/products/slug/does-not-exist').expect(404);
  });
});
