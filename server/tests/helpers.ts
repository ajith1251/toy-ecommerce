import path from 'node:path';
import { fileURLToPath } from 'node:url';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { closePool, createPool, type DbPool } from '../src/db/pool.js';
import type { EmailService, PasswordResetEmail } from '../src/services/emailService.js';

export const SERVER_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/** Dedicated embedded PostgreSQL instance for tests — never touches dev data. */
export const TEST_DB = {
  port: 55433,
  dbName: 'toybox_test',
  user: 'toybox',
  password: 'toybox',
  dataDir: path.resolve(SERVER_ROOT, '.pgdata-test'),
} as const;

export function testConnectionUrl(): string {
  return `postgres://${TEST_DB.user}:${TEST_DB.password}@127.0.0.1:${TEST_DB.port}/${TEST_DB.dbName}`;
}

export async function createTestPool(): Promise<DbPool> {
  return createPool({ connectionString: testConnectionUrl(), max: 5 });
}

export interface TestContext {
  app: ReturnType<typeof createApp>;
  pool: DbPool;
}

export async function createTestContext(): Promise<TestContext> {
  const pool = await createTestPool();
  const app = createApp({ pool });
  return { app, pool };
}

/**
 * In-memory email transport for tests: records every password-reset email
 * instead of delivering it, so specs can assert the link (and extract the
 * one-time token) without touching SMTP.
 */
export function captureEmailService(): { email: EmailService; sent: PasswordResetEmail[] } {
  const sent: PasswordResetEmail[] = [];
  const email: EmailService = {
    transport: 'console',
    sendPasswordResetEmail: async message => {
      sent.push(message);
    },
  };
  return { email, sent };
}

/**
 * Resets all mutable transactional state between tests: users, sessions,
 * addresses, carts, wishlists, orders, and product stock (restored to the
 * deterministic seed formula). The catalog itself is seeded once by the
 * global setup.
 */
export async function resetTransactionalData(pool: DbPool): Promise<void> {
  await pool.query(
    'TRUNCATE order_items, orders, cart_items, carts, wishlist_items, wishlists, sessions, addresses, password_resets, users RESTART IDENTITY CASCADE'
  );
  await pool.query('UPDATE products SET stock_quantity = 25 + ((id * 7) % 70)');
}

export function uniqueEmail(): string {
  return `user-${Date.now()}-${Math.random().toString(36).slice(2, 10)}@example.com`;
}

/**
 * Registers a fresh account via the API. Returns the Set-Cookie header value
 * (the session cookie) for authenticated follow-up requests, plus the email
 * used.
 */
export async function registerUser(app: ReturnType<typeof createApp>, email = uniqueEmail(), password = 'Password123!') {
  const res = await request(app)
    .post('/api/auth/register')
    .send({
      email,
      password,
      firstName: 'Test',
      lastName: 'User',
      phone: '+1 555 000 0000',
    })
    .expect(201);
  const cookie = res.headers['set-cookie']?.[0]?.split(';')[0] ?? '';
  return { email, password, cookie };
}

/** Anonymous client id used by most tests. */
export const TEST_CLIENT_ID = 'test-client-00000001';

/** Valid shipping payload matching the frontend form rules. */
export function validShipping(overrides: Record<string, unknown> = {}) {
  return {
    firstName: 'Jane',
    lastName: 'Doe',
    email: 'jane@example.com',
    phone: '+1 555 123 4567',
    line1: '123 Toy Lane',
    line2: '',
    city: 'Springfield',
    state: 'CA',
    postalCode: '90210',
    country: 'United States',
    ...overrides,
  };
}
