import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { loadConfig } from '../src/config.js';
import { closePool, type DbPool } from '../src/db/pool.js';
import { createApp } from '../src/app.js';
import { createTestPool, resetTransactionalData, uniqueEmail, type TestContext } from './helpers.js';

let ctx: TestContext;
let pool: DbPool;

beforeAll(async () => {
  // Generous auth rate limit for this file (the rate-limit test builds its
  // own app with a tight limit) so normal tests are never throttled.
  const config = loadConfig();
  config.auth.authRateLimit = { windowMs: 15 * 60 * 1000, max: 1000 };
  pool = await createTestPool();
  ctx = { app: createApp({ pool, config }), pool };
});

beforeEach(async () => {
  await resetTransactionalData(pool);
});

afterAll(async () => {
  await closePool(pool);
});

const PASSWORD = 'Password123!';

function cookieFrom(res: request.Response): string {
  const header = res.headers['set-cookie'];
  const cookie = Array.isArray(header) ? header[0] : header;
  return (cookie ?? '').split(';')[0];
}

async function register(email = uniqueEmail()) {
  const res = await request(ctx.app)
    .post('/api/auth/register')
    .send({ email, password: PASSWORD, firstName: 'Test', lastName: 'User', phone: '+1 555 000 0000' })
    .expect(201);
  return { email, res, cookie: cookieFrom(res) };
}

describe('POST /api/auth/register', () => {
  it('creates an account, sets a session cookie, and returns a safe user', async () => {
    const { res } = await register();
    expect(res.body.data.user).toMatchObject({ email: expect.stringContaining('@'), firstName: 'Test' });
    expect(res.body.data.user).not.toHaveProperty('password_hash');
    expect(res.body.data.user).not.toHaveProperty('password');
    expect(res.headers['set-cookie']?.[0]).toContain('toybox_session=');
    expect(res.headers['set-cookie']?.[0]).toContain('HttpOnly');
    expect(res.headers['set-cookie']?.[0]).toContain('SameSite=Lax');
  });

  it('normalizes email casing and enforces uniqueness at the DB level', async () => {
    const email = uniqueEmail();
    await register(email);
    const dup = await request(ctx.app)
      .post('/api/auth/register')
      .send({ email: email.toUpperCase(), password: PASSWORD, firstName: 'A', lastName: 'B' })
      .expect(409);
    expect(dup.body.error.code).toBe('conflict');
    expect(dup.body.error.details?.code).toBe('email_taken');

    const rows = await pool.query('SELECT count(*)::int AS count FROM users');
    expect(rows.rows[0]?.count).toBe(1);
  });

  it('rejects invalid emails and short passwords', async () => {
    for (const email of ['not-an-email', '', 'a@b']) {
      const res = await request(ctx.app)
        .post('/api/auth/register')
        .send({ email, password: PASSWORD, firstName: 'A', lastName: 'B' })
        .expect(400);
      expect(res.body.error.code).toBe('validation');
    }
    const res = await request(ctx.app)
      .post('/api/auth/register')
      .send({ email: uniqueEmail(), password: 'short', firstName: 'A', lastName: 'B' })
      .expect(400);
    expect(res.body.error.code).toBe('validation');
  });

  it('stores only a password hash — never the plaintext', async () => {
    await register();
    const rows = await pool.query('SELECT password_hash FROM users');
    const hash = rows.rows[0]?.password_hash as string;
    expect(hash).not.toContain(PASSWORD);
    expect(hash).toMatch(/^\$argon2/);
  });
});

describe('POST /api/auth/login', () => {
  it('logs in with valid credentials and establishes a session', async () => {
    const { email } = await register();
    const res = await request(ctx.app)
      .post('/api/auth/login')
      .send({ email, password: PASSWORD })
      .expect(200);
    expect(res.body.data.user.email).toBe(email);
    expect(res.headers['set-cookie']?.[0]).toContain('toybox_session=');

    const rows = await pool.query('SELECT last_login_at FROM users WHERE email = $1', [email]);
    expect(rows.rows[0]?.last_login_at).not.toBeNull();
  });

  it('returns a generic message for unknown email and wrong password', async () => {
    const unknown = await request(ctx.app)
      .post('/api/auth/login')
      .send({ email: uniqueEmail(), password: PASSWORD })
      .expect(401);
    expect(unknown.body.error.message).toBe('Invalid email or password');

    const { email } = await register();
    const wrong = await request(ctx.app)
      .post('/api/auth/login')
      .send({ email, password: 'WrongPass1' })
      .expect(401);
    expect(wrong.body.error.message).toBe('Invalid email or password');
    // Both cases produce identical messages — no account enumeration.
    // (requestId differs per request by design; compare the safe fields.)
    expect(unknown.body.error.code).toBe(wrong.body.error.code);
    expect(unknown.body.error.message).toBe(wrong.body.error.message);
    expect(Object.keys(unknown.body.error).sort()).toEqual(['code', 'message', 'requestId']);
  });

  it('rejects a suspended account', async () => {
    const { email } = await register();
    await pool.query(`UPDATE users SET status = 'suspended' WHERE email = $1`, [email]);
    const res = await request(ctx.app)
      .post('/api/auth/login')
      .send({ email, password: PASSWORD })
      .expect(401);
    expect(res.body.error.message).toContain('suspended');
  });

  it('creates a new session on every login (session fixation protection)', async () => {
    const { email } = await register();
    const first = await request(ctx.app).post('/api/auth/login').send({ email, password: PASSWORD });
    const second = await request(ctx.app).post('/api/auth/login').send({ email, password: PASSWORD });
    const count = await pool.query('SELECT count(*)::int AS count FROM sessions WHERE revoked_at IS NULL');
    expect(count.rows[0]?.count).toBe(3); // register + 2 logins
    expect(cookieFrom(first)).not.toBe(cookieFrom(second));
  });
});

describe('POST /api/auth/logout', () => {
  it('revokes the session server-side; the cookie no longer authenticates', async () => {
    const { cookie } = await register();
    await request(ctx.app).post('/api/auth/logout').set('Cookie', cookie).expect(200);

    const me = await request(ctx.app).get('/api/auth/me').set('Cookie', cookie).expect(401);
    expect(me.body.error.code).toBe('unauthorized');
  });

  it('does not merely clear a frontend variable — the session row is revoked', async () => {
    const { cookie } = await register();
    await request(ctx.app).post('/api/auth/logout').set('Cookie', cookie).expect(200);
    const rows = await pool.query('SELECT revoked_at FROM sessions');
    expect(rows.rows[0]?.revoked_at).not.toBeNull();
  });

  it('requires authentication', async () => {
    await request(ctx.app).post('/api/auth/logout').expect(401);
  });

  it('logout-all revokes every session including the current one', async () => {
    const { cookie, email } = await register();
    const second = await request(ctx.app).post('/api/auth/login').send({ email, password: PASSWORD }).expect(200);
    const secondCookie = cookieFrom(second);

    await request(ctx.app).post('/api/auth/logout-all').set('Cookie', cookie).expect(200);

    await request(ctx.app).get('/api/auth/me').set('Cookie', cookie).expect(401);
    await request(ctx.app).get('/api/auth/me').set('Cookie', secondCookie).expect(401);
    const rows = await pool.query('SELECT count(*)::int AS count FROM sessions WHERE revoked_at IS NULL');
    expect(rows.rows[0]?.count).toBe(0);
  });
});

describe('GET /api/auth/me', () => {
  it('returns the current user for an authenticated request', async () => {
    const { cookie, email } = await register();
    const res = await request(ctx.app).get('/api/auth/me').set('Cookie', cookie).expect(200);
    expect(res.body.data.user.email).toBe(email);
    expect(res.body.data.user).not.toHaveProperty('password_hash');
  });

  it('returns 401 for an unauthenticated request', async () => {
    await request(ctx.app).get('/api/auth/me').expect(401);
  });

  it('returns 401 for an invalid/forged session cookie', async () => {
    await request(ctx.app).get('/api/auth/me').set('Cookie', 'toybox_session=forgedtoken').expect(401);
  });
});

describe('POST /api/auth/refresh', () => {
  it('rotates the session token and invalidates the old one', async () => {
    const { cookie } = await register();
    const res = await request(ctx.app).post('/api/auth/refresh').set('Cookie', cookie).expect(200);
    const newCookie = cookieFrom(res);
    expect(newCookie).not.toBe(cookie);

    // Old token is revoked.
    await request(ctx.app).get('/api/auth/me').set('Cookie', cookie).expect(401);
    // New token works.
    const me = await request(ctx.app).get('/api/auth/me').set('Cookie', newCookie).expect(200);
    expect(me.body.data.user.email).toBeDefined();
  });

  it('requires authentication', async () => {
    await request(ctx.app).post('/api/auth/refresh').expect(401);
  });
});

describe('rate limiting & CSRF origin check', () => {
  it('rate limits auth endpoints (dedicated app with a tight limit)', async () => {
    const config = loadConfig();
    config.auth.authRateLimit = { windowMs: 60_000, max: 3 };
    const limitedApp = createApp({ pool, config });

    const email = uniqueEmail();
    await register(email);
    for (let i = 0; i < 3; i++) {
      await request(limitedApp).post('/api/auth/login').send({ email, password: PASSWORD }).expect(200);
    }
    const blocked = await request(limitedApp)
      .post('/api/auth/login')
      .send({ email, password: PASSWORD })
      .expect(429);
    expect(blocked.body.error.code).toBe('rate_limited');
  });

  it('rejects cross-origin mutations with a safe error (CORS + CSRF defense)', async () => {
    const res = await request(ctx.app)
      .post('/api/orders')
      .set('Origin', 'https://evil.example.com')
      .set('x-client-id', 'test-client-00000001')
      .send({
        items: [{ productId: 1, quantity: 1 }],
        shipping: { firstName: 'Jane', lastName: 'Doe', email: 'jane@example.com', phone: '+1 555 123 4567', line1: '123 Toy Lane', line2: '', city: 'Springfield', state: 'CA', postalCode: '90210', country: 'United States' },
        payment: { method: 'cod' },
      })
      .expect(403);
    expect(res.body.error.code).toBe('forbidden');
  });

  it('allows same-origin mutations', async () => {
    await request(ctx.app)
      .post('/api/orders')
      .set('Origin', 'http://localhost:5173')
      .set('x-client-id', 'test-client-00000001')
      .send({
        items: [{ productId: 1, quantity: 1 }],
        shipping: { firstName: 'Jane', lastName: 'Doe', email: 'jane@example.com', phone: '+1 555 123 4567', line1: '123 Toy Lane', line2: '', city: 'Springfield', state: 'CA', postalCode: '90210', country: 'United States' },
        payment: { method: 'cod' },
      })
      .expect(201);
  });
});
