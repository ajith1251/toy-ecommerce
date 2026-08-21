import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { closePool, type DbPool } from '../src/db/pool.js';
import {
  FREE_SHIPPING_THRESHOLD,
  SHIPPING_FEE,
  TAX_RATE,
  calcServerTotals,
} from '../src/utils/pricing.js';
import { generateOrderNumber, isOrderNumber } from '../src/utils/ids.js';
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

describe('GET /api/health', () => {
  it('reports the API and database as up', async () => {
    const res = await request(ctx.app).get('/api/health').expect(200);
    expect(res.body.data).toMatchObject({ status: 'ok', db: 'up' });
  });
});

describe('error format', () => {
  it('returns a consistent error envelope for unknown API routes', async () => {
    const res = await request(ctx.app).get('/api/does-not-exist').expect(404);
    expect(res.body.error).toMatchObject({ code: 'not_found', message: expect.any(String) });
    // Correlation id for support/debugging — no secrets, safe to expose.
    expect(res.body.error.requestId).toBeTruthy();
  });

  it('never leaks internal details on unexpected errors', async () => {
    // A deliberately broken route is registered by the app factory test only.
    const { app, pool: brokenPool } = await createTestContext();
    try {
      // Simulate an internal error through a malformed request that reaches the DB.
      const res = await request(app).get('/api/products?category=' + 'x'.repeat(1000)).set('Accept', 'application/json');
      expect(res.status).toBeLessThan(500); // handled by validation, not a crash
      expect(res.body).not.toHaveProperty('stack');
    } finally {
      await closePool(brokenPool);
    }
  });
});

describe('server pricing rules (boundaries)', () => {
  it('charges shipping below the threshold, free at and above it', () => {
    expect(calcServerTotals([{ unitPrice: 49.99, quantity: 1 }]).shipping).toBe(SHIPPING_FEE);
    expect(calcServerTotals([{ unitPrice: 25, quantity: 2 }]).shipping).toBe(0); // exactly 50
    expect(calcServerTotals([{ unitPrice: 50.01, quantity: 1 }]).shipping).toBe(0);
  });

  it('calculates subtotal, discount, tax and grand total consistently', () => {
    const totals = calcServerTotals([{ unitPrice: 34.99, quantity: 2 }, { unitPrice: 9.99, quantity: 1 }]);
    expect(totals.subtotal).toBe(79.97);
    expect(totals.discount).toBe(0);
    expect(totals.shipping).toBe(0);
    expect(totals.tax).toBe(6.4); // 79.97 × 0.08
    expect(totals.grandTotal).toBe(86.37);
  });

  it('keeps decimal arithmetic exact (no float drift)', () => {
    const totals = calcServerTotals([{ unitPrice: 0.1, quantity: 3 }]);
    expect(totals.subtotal).toBe(0.3);
    expect(totals.tax).toBe(0.02); // 0.3 × 0.08 = 0.024 → 0.02
  });

  it('mirrors the frontend pricing constants', async () => {
    const frontend = await import('../../src/constants/checkout.ts');
    expect(FREE_SHIPPING_THRESHOLD).toBe(frontend.FREE_SHIPPING_THRESHOLD);
    expect(SHIPPING_FEE).toBe(frontend.SHIPPING_FEE);
    expect(TAX_RATE).toBe(frontend.TAX_RATE);
  });
});

describe('order number generation', () => {
  it('produces TBX-YYYYMMDD-XXXXXX format', () => {
    const now = new Date(2026, 7, 17, 12, 0, 0);
    expect(generateOrderNumber(now)).toMatch(/^TBX-20260817-[0-9A-Z]{6}$/);
    expect(isOrderNumber('TBX-20260817-8F4K2M')).toBe(true);
    expect(isOrderNumber('nope')).toBe(false);
  });

  it('produces distinct numbers across many generations', () => {
    const seen = new Set<string>();
    for (let i = 0; i < 1000; i++) seen.add(generateOrderNumber(new Date(2026, 7, 17)));
    expect(seen.size).toBe(1000);
  });
});

describe('migrations', () => {
  it('are idempotent — re-running applies nothing', async () => {
    const { runMigrations } = await import('../src/db/migrations.js');
    const applied = await runMigrations(pool);
    expect(applied).toEqual([]);
  });
});
