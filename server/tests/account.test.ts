import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { loadConfig } from '../src/config.js';
import { createApp } from '../src/app.js';
import { closePool, type DbPool } from '../src/db/pool.js';
import { captureEmailService, createTestPool, registerUser, resetTransactionalData, type TestContext } from './helpers.js';
import type { PasswordResetEmail } from '../src/services/emailService.js';

let ctx: TestContext;
let pool: DbPool;
let resetEmails: PasswordResetEmail[];

beforeAll(async () => {
  // Generous auth rate limit — this file registers many accounts.
  const config = loadConfig();
  config.auth.authRateLimit = { windowMs: 15 * 60 * 1000, max: 1000 };
  const capture = captureEmailService();
  resetEmails = capture.sent;
  pool = await createTestPool();
  ctx = { app: createApp({ pool, config, email: capture.email }), pool };
});

beforeEach(async () => {
  await resetTransactionalData(pool);
});

afterAll(async () => {
  await closePool(pool);
});

function addressBody(overrides: Record<string, unknown> = {}) {
  return {
    label: 'Home',
    firstName: 'Test',
    lastName: 'User',
    phone: '+1 555 111 2222',
    line1: '123 Toy Lane',
    line2: '',
    city: 'Springfield',
    state: 'CA',
    postalCode: '90210',
    country: 'United States',
    ...overrides,
  };
}

describe('GET /api/account/profile', () => {
  it('returns the profile for the authenticated user', async () => {
    const { cookie } = await registerUser(ctx.app);
    const res = await request(ctx.app).get('/api/account/profile').set('Cookie', cookie).expect(200);
    expect(res.body.data.user.email).toBeDefined();
    expect(res.body.data.user).not.toHaveProperty('password_hash');
  });

  it('rejects unauthenticated access', async () => {
    await request(ctx.app).get('/api/account/profile').expect(401);
  });
});

describe('PATCH /api/account/profile', () => {
  it('updates editable fields only', async () => {
    const { cookie } = await registerUser(ctx.app);
    const res = await request(ctx.app)
      .patch('/api/account/profile')
      .set('Cookie', cookie)
      .send({ firstName: 'Jane', lastName: 'Doe', phone: '+1 555 999 0000' })
      .expect(200);
    expect(res.body.data.user).toMatchObject({ firstName: 'Jane', lastName: 'Doe', phone: '+1 555 999 0000' });
  });

  it('never lets the client change id, email, status, or password hash', async () => {
    const { cookie, email } = await registerUser(ctx.app);
    const res = await request(ctx.app)
      .patch('/api/account/profile')
      .set('Cookie', cookie)
      .send({ firstName: 'Jane', id: 999, email: 'hacked@example.com', status: 'suspended', password_hash: 'x' })
      .expect(200);
    expect(res.body.data.user.id).not.toBe(999);
    expect(res.body.data.user.email).toBe(email);
    expect(res.body.data.user.status).toBe('active');

    const rows = await pool.query('SELECT email, status FROM users');
    expect(rows.rows[0]?.email).toBe(email);
    expect(rows.rows[0]?.status).toBe('active');
  });
});

describe('PATCH /api/account/password', () => {
  it('changes the password; old password stops working', async () => {
    const { cookie, email, password } = await registerUser(ctx.app);
    await request(ctx.app)
      .patch('/api/account/password')
      .set('Cookie', cookie)
      .send({ currentPassword: password, newPassword: 'NewPassword456!' })
      .expect(200);

    await request(ctx.app).post('/api/auth/login').send({ email, password }).expect(401);
    await request(ctx.app).post('/api/auth/login').send({ email, password: 'NewPassword456!' }).expect(200);
  });

  it('rejects a wrong current password', async () => {
    const { cookie, password } = await registerUser(ctx.app);
    const res = await request(ctx.app)
      .patch('/api/account/password')
      .set('Cookie', cookie)
      .send({ currentPassword: 'WrongPassword!', newPassword: 'NewPassword456!' })
      .expect(401);
    expect(res.body.error.message).toBe('Current password is incorrect');
    void password;
  });

  it('revokes other sessions but keeps the current one', async () => {
    const { cookie, email, password } = await registerUser(ctx.app);
    // Second session on another "device".
    const second = await request(ctx.app).post('/api/auth/login').send({ email, password }).expect(200);
    const secondCookie = (second.headers['set-cookie']?.[0] ?? '').split(';')[0];

    await request(ctx.app)
      .patch('/api/account/password')
      .set('Cookie', cookie)
      .send({ currentPassword: password, newPassword: 'NewPassword456!' })
      .expect(200);

    // Current session still valid.
    await request(ctx.app).get('/api/auth/me').set('Cookie', cookie).expect(200);
    // Other session revoked.
    await request(ctx.app).get('/api/auth/me').set('Cookie', secondCookie).expect(401);
  });
});

describe('password reset (email delivery)', () => {
  it('returns a generic response whether or not the email exists (no enumeration, no token)', async () => {
    resetEmails.length = 0;
    const unknown = await request(ctx.app)
      .post('/api/auth/forgot-password')
      .send({ email: 'nobody@example.com' })
      .expect(200);
    expect(unknown.body.data.ok).toBe(true);
    expect(unknown.body.data.resetToken).toBeUndefined();
    expect(resetEmails).toHaveLength(0); // unknown email → nothing sent

    const { email } = await registerUser(ctx.app);
    const known = await request(ctx.app).post('/api/auth/forgot-password').send({ email }).expect(200);
    expect(known.body.data.ok).toBe(true);
    // The one-time token is delivered by email only — never in the response.
    expect(known.body.data.resetToken).toBeUndefined();
    expect(known.body.data.resetUrl).toBeUndefined();
    expect(resetEmails).toHaveLength(1);
    expect(resetEmails[0].to).toBe(email);
    expect(resetEmails[0].resetUrl).toMatch(/^http:\/\/localhost:5173\/reset-password\?token=/);
  });

  it('resets the password with the emailed one-time token and invalidates old sessions', async () => {
    const { cookie, email, password } = await registerUser(ctx.app);
    resetEmails.length = 0;
    await request(ctx.app).post('/api/auth/forgot-password').send({ email }).expect(200);
    const token = new URL(resetEmails[0].resetUrl).searchParams.get('token');
    expect(token).toBeTruthy();

    await request(ctx.app)
      .post('/api/auth/reset-password')
      .send({ token, password: 'ResetPass123!' })
      .expect(200);

    // Old password fails, new one works.
    await request(ctx.app).post('/api/auth/login').send({ email, password }).expect(401);
    await request(ctx.app).post('/api/auth/login').send({ email, password: 'ResetPass123!' }).expect(200);

    // Token is single-use.
    await request(ctx.app).post('/api/auth/reset-password').send({ token, password: 'Again123!' }).expect(401);
    // Old sessions were revoked.
    await request(ctx.app).get('/api/auth/me').set('Cookie', cookie).expect(401);
  });

  it('stores only the token hash — the raw token never touches the database', async () => {
    const { email } = await registerUser(ctx.app);
    resetEmails.length = 0;
    await request(ctx.app).post('/api/auth/forgot-password').send({ email }).expect(200);
    const raw = new URL(resetEmails[0].resetUrl).searchParams.get('token') as string;

    const rows = await pool.query<{ token_hash: string }>('SELECT token_hash FROM password_resets');
    expect(rows.rows).toHaveLength(1);
    expect(rows.rows[0].token_hash).not.toContain(raw);
    expect(rows.rows[0].token_hash).toMatch(/^[a-f0-9]{64}$/); // sha256 hex
  });

  it('rejects invalid or expired tokens', async () => {
    await request(ctx.app)
      .post('/api/auth/reset-password')
      .send({ token: 'bogus-token-xxxxxxxxxxxxxxxxxxxx', password: 'Whatever123!' })
      .expect(401);
  });
});

describe('addresses', () => {
  it('creates, lists, updates, sets default, and deletes addresses', async () => {
    const { cookie } = await registerUser(ctx.app);

    const created = await request(ctx.app)
      .post('/api/account/addresses')
      .set('Cookie', cookie)
      .send(addressBody())
      .expect(201);
    const id = created.body.data.address.id as number;
    expect(created.body.data.address.isDefault).toBe(true); // first address becomes default

    const second = await request(ctx.app)
      .post('/api/account/addresses')
      .set('Cookie', cookie)
      .send(addressBody({ label: 'Work', line1: '456 Office Blvd' }))
      .expect(201);
    expect(second.body.data.address.isDefault).toBe(false);

    const updated = await request(ctx.app)
      .patch(`/api/account/addresses/${id}`)
      .set('Cookie', cookie)
      .send(addressBody({ label: 'Primary', city: 'Oakland' }))
      .expect(200);
    expect(updated.body.data.address).toMatchObject({ label: 'Primary', city: 'Oakland' });

    await request(ctx.app).post(`/api/account/addresses/${id}/default`).set('Cookie', cookie).expect(200);
    const list = await request(ctx.app).get('/api/account/addresses').set('Cookie', cookie).expect(200);
    expect(list.body.data.addresses).toHaveLength(2);
    expect(list.body.data.addresses[0].id).toBe(id);

    await request(ctx.app).delete(`/api/account/addresses/${id}`).set('Cookie', cookie).expect(200);
    const after = await request(ctx.app).get('/api/account/addresses').set('Cookie', cookie).expect(200);
    expect(after.body.data.addresses).toHaveLength(1);
  });

  it('validates required address fields', async () => {
    const { cookie } = await registerUser(ctx.app);
    const res = await request(ctx.app)
      .post('/api/account/addresses')
      .set('Cookie', cookie)
      .send({ label: 'Home' })
      .expect(400);
    expect(res.body.error.code).toBe('validation');
  });

  it('returns 404 for unknown address ids', async () => {
    const { cookie } = await registerUser(ctx.app);
    await request(ctx.app).patch('/api/account/addresses/999999').set('Cookie', cookie).send(addressBody()).expect(404);
    await request(ctx.app).delete('/api/account/addresses/999999').set('Cookie', cookie).expect(404);
  });
});
