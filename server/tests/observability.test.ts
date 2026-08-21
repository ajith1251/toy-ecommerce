import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { closePool, type DbPool } from '../src/db/pool.js';
import { validateProductionConfig, type ServerConfig } from '../src/config.js';
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

describe('health liveness/readiness split', () => {
  it('/api/health/live reports the process alive without touching dependencies', async () => {
    const res = await request(ctx.app).get('/api/health/live').expect(200);
    expect(res.body.data).toMatchObject({ status: 'live' });
  });

  it('/api/health/ready verifies the database connection', async () => {
    const res = await request(ctx.app).get('/api/health/ready').expect(200);
    expect(res.body.data).toMatchObject({ status: 'ready', db: 'up' });
  });
});

describe('request correlation', () => {
  it('generates and echoes an X-Request-Id when none is supplied', async () => {
    const res = await request(ctx.app).get('/api/health/live');
    expect(res.headers['x-request-id']).toMatch(/^[A-Za-z0-9_-]{8,64}$/);
  });

  it('honours a trusted proxy-supplied X-Request-Id', async () => {
    const res = await request(ctx.app)
      .get('/api/health/live')
      .set('X-Request-Id', 'test-correlation-id-1234');
    expect(res.headers['x-request-id']).toBe('test-correlation-id-1234');
  });

  it('rejects malformed proxy ids and generates a safe one instead', async () => {
    const res = await request(ctx.app)
      .get('/api/health/live')
      .set('X-Request-Id', 'bad id with spaces and injection "attempt"');
    expect(res.headers['x-request-id']).toMatch(/^[A-Za-z0-9_-]{8,64}$/);
    expect(res.headers['x-request-id']).not.toContain(' ');
  });

  it('includes the request id in error envelopes for support correlation', async () => {
    const res = await request(ctx.app).get('/api/does-not-exist').expect(404);
    expect(res.body.error.requestId).toBeTruthy();
    expect(res.body.error.requestId).toBe(res.headers['x-request-id']);
  });

  it('never exposes stack traces or internal details in error bodies', async () => {
    const res = await request(ctx.app).get('/api/does-not-exist').expect(404);
    const body = JSON.stringify(res.body);
    expect(body).not.toMatch(/at .*\(|node_modules|\.ts:/);
  });
});

describe('production configuration validation (fail-safe startup)', () => {
  const validProdConfig = (): ServerConfig =>
    ({
      nodeEnv: 'production',
      isProduction: true,
      port: 4000,
      databaseUrl: 'postgres://app:secret@db.internal:5432/toybox',
      embedded: { enabled: false, port: 5432, dbName: 'toybox', user: 'app', password: 'secret', dataDir: '/tmp' },
      db: { poolMax: 10, idleTimeoutMs: 30_000, connectionTimeoutMs: 10_000 },
      logFormat: 'json',
      corsOrigins: ['https://shop.example.com'],
      rateLimit: { windowMs: 900_000, max: 1000 },
      auth: {
        sessionTtlMs: 604_800_000,
        cookieName: 'toybox_session',
        cookieSecure: true,
        passwordResetTtlMs: 1_800_000,
        authRateLimit: { windowMs: 900_000, max: 20 },
      },
      adminRateLimit: { windowMs: 900_000, max: 100 },
      email: {
        transport: 'smtp',
        from: 'ToyBox <no-reply@example.com>',
        appBaseUrl: 'https://shop.example.com',
        outboxPath: '/tmp/outbox',
        smtp: { host: 'smtp.example.com', port: 587, user: 'mailer', pass: 'secret', secure: false },
      },
      razorpay: { keyId: 'rzp_live_x', keySecret: 'secret', webhookSecret: 'whsec', timeoutMs: 15_000 },
    }) as ServerConfig;

  it('accepts a fully-specified production configuration', () => {
    expect(validateProductionConfig(validProdConfig())).toEqual([]);
  });

  it('rejects a missing DATABASE_URL (embedded PostgreSQL is dev-only)', () => {
    const config = validProdConfig();
    config.databaseUrl = null;
    const problems = validateProductionConfig(config);
    expect(problems.some(p => p.includes('DATABASE_URL'))).toBe(true);
  });

  it('rejects localhost CORS origins in production', () => {
    const config = validProdConfig();
    config.corsOrigins = ['http://localhost:5173'];
    const problems = validateProductionConfig(config);
    expect(problems.some(p => p.includes('CORS_ORIGINS') && p.includes('localhost'))).toBe(true);
  });

  it('rejects disabled secure cookies in production', () => {
    const config = validProdConfig();
    config.auth.cookieSecure = false;
    const problems = validateProductionConfig(config);
    expect(problems.some(p => p.includes('SESSION_COOKIE_SECURE'))).toBe(true);
  });

  it('rejects missing Razorpay credentials and webhook secret', () => {
    const config = validProdConfig();
    config.razorpay.keySecret = '';
    config.razorpay.webhookSecret = '';
    const problems = validateProductionConfig(config);
    expect(problems.some(p => p.includes('RAZORPAY_KEY_SECRET'))).toBe(true);
    expect(problems.some(p => p.includes('RAZORPAY_WEBHOOK_SECRET'))).toBe(true);
  });

  it('requires deliverable password-reset email in production', () => {
    const config = validProdConfig();
    config.email.transport = 'console';
    config.email.smtp = null;
    const problems = validateProductionConfig(config);
    expect(problems.some(p => p.includes('EMAIL_TRANSPORT'))).toBe(true);
  });
});
