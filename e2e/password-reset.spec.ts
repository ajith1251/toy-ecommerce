import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const PASSWORD = 'Password123!';
// Playwright runs specs with the project root as cwd.
const OUTBOX = path.resolve(process.cwd(), 'server/.outbox-e2e.jsonl');

function uniqueEmail(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 10000)}@example.com`;
}

async function register(page: import('@playwright/test').Page, email: string): Promise<void> {
  await page.goto('/register');
  await page.getByLabel('First name').fill('Jane');
  await page.getByLabel('Last name').fill('Doe');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password', { exact: true }).fill(PASSWORD);
  await page.getByLabel('Confirm password').fill(PASSWORD);
  await page.getByRole('button', { name: 'Create Account' }).click();
  await expect(page).toHaveURL(/\/account$/);
}

/** Reads the reset link the server "sent" to `email` from the JSONL outbox. */
function resetLinkFromOutbox(email: string): string {
  const lines = readFileSync(OUTBOX, 'utf8').trim().split('\n').filter(Boolean);
  for (let i = lines.length - 1; i >= 0; i--) {
    const record = JSON.parse(lines[i]);
    if (record.to === email) return record.resetUrl;
  }
  throw new Error(`No reset email found for ${email} in ${OUTBOX}`);
}

test.describe('password reset', () => {
  test('requests a reset by email, sets a new password, and logs in with it', async ({ page, request }) => {
    const email = uniqueEmail('reset');

    // Register, then request a reset link through the API.
    await register(page, email);
    await page.getByRole('button', { name: 'Log out' }).click();
    await expect(page).toHaveURL('/');

    const forgot = await request.post('http://localhost:4000/api/auth/forgot-password', {
      data: { email },
    });
    expect(forgot.status()).toBe(200);
    // The token is delivered by email only — never in the API response.
    const body = (await forgot.json()) as { data: Record<string, unknown> };
    expect(body.data.resetToken).toBeUndefined();
    expect(body.data.resetUrl).toBeUndefined();

    // The link landed in the outbox (the E2E email transport).
    const resetUrl = resetLinkFromOutbox(email);
    const token = new URL(resetUrl).searchParams.get('token');
    expect(token).toBeTruthy();
    expect(resetUrl).toContain('localhost:4173/reset-password');

    // Open the emailed link and choose a new password.
    await page.goto(`/reset-password?token=${token}`);
    await expect(page.getByRole('heading', { name: 'Choose a new password' })).toBeVisible();
    await page.getByLabel('New password', { exact: true }).fill('NewPassword456!');
    await page.getByLabel('Confirm new password').fill('NewPassword456!');
    await page.getByRole('button', { name: 'Update password' }).click();
    await expect(page.getByRole('heading', { name: 'Password updated' })).toBeVisible();

    // The old password stops working; the new one does.
    await page.getByRole('link', { name: /log in with your new password/i }).click();
    await expect(page).toHaveURL(/\/login/);
    await page.getByLabel('Email').fill(email);
    await page.getByLabel('Password').fill(PASSWORD);
    await page.getByRole('button', { name: 'Log In' }).click();
    await expect(page.getByText(/invalid email or password/i)).toBeVisible();

    await page.getByLabel('Email').fill(email);
    await page.getByLabel('Password').fill('NewPassword456!');
    await page.getByRole('button', { name: 'Log In' }).click();
    await expect(page).toHaveURL(/\/account$/);
    await expect(page.getByRole('heading', { name: 'Hi, Jane' })).toBeVisible();
  });

  test('forgot-password never reveals whether an email is registered', async ({ request }) => {
    const known = uniqueEmail('known');
    // Register via API so no browser session is needed.
    await request.post('http://localhost:4000/api/auth/register', {
      data: {
        email: known,
        password: PASSWORD,
        firstName: 'Jane',
        lastName: 'Doe',
      },
    });

    const knownRes = await request.post('http://localhost:4000/api/auth/forgot-password', {
      data: { email: known },
    });
    const unknownRes = await request.post('http://localhost:4000/api/auth/forgot-password', {
      data: { email: 'nobody-' + Date.now() + '@example.com' },
    });
    expect(knownRes.status()).toBe(200);
    expect(unknownRes.status()).toBe(200);
    const knownBody = (await knownRes.json()) as { data: Record<string, unknown> };
    const unknownBody = (await unknownRes.json()) as { data: Record<string, unknown> };
    // Identical response shape — no enumeration either way.
    expect(knownBody.data).toEqual({ ok: true });
    expect(unknownBody.data).toEqual({ ok: true });
  });

  test('a stale or invalid token shows the invalid-link error', async ({ page }) => {
    await page.goto('/reset-password?token=not-a-real-token-1234567890');
    await expect(page.getByRole('heading', { name: 'Choose a new password' })).toBeVisible();
    await page.getByLabel('New password', { exact: true }).fill('NewPassword456!');
    await page.getByLabel('Confirm new password').fill('NewPassword456!');
    await page.getByRole('button', { name: 'Update password' }).click();
    await expect(page.getByText('This reset link is invalid or has expired')).toBeVisible();
  });
});
