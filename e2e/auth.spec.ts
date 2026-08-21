import { test, expect, type Page } from '@playwright/test';

const PASSWORD = 'Password123!';

function uniqueEmail(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 10000)}@example.com`;
}

async function register(page: Page, email: string, firstName = 'Jane', lastName = 'Doe'): Promise<void> {
  await page.goto('/register');
  await page.getByLabel('First name').fill(firstName);
  await page.getByLabel('Last name').fill(lastName);
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password', { exact: true }).fill(PASSWORD);
  await page.getByLabel('Confirm password').fill(PASSWORD);
  await page.getByRole('button', { name: 'Create Account' }).click();
}

async function login(page: Page, email: string, password = PASSWORD): Promise<void> {
  await page.goto('/login');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Log In' }).click();
}

test.describe('authentication', () => {
  test('registers an account and lands on the account overview', async ({ page }) => {
    const email = uniqueEmail('reg');
    await register(page, email);

    await expect(page).toHaveURL(/\/account$/);
    await expect(page.getByRole('heading', { name: 'Hi, Jane' })).toBeVisible();
    await expect(page.getByText(email)).toBeVisible();
  });

  test('rejects a duplicate email with a clear error', async ({ page }) => {
    const email = uniqueEmail('dup');
    await register(page, email);
    await expect(page).toHaveURL(/\/account$/);

    // Log out, then try registering the same email again.
    await page.getByRole('button', { name: 'Log out' }).click();
    await expect(page).toHaveURL('/');
    await register(page, email);
    await expect(page.getByText(/already registered|already exists/i)).toBeVisible();
  });

  test('logs in, then logout invalidates the session', async ({ page }) => {
    const email = uniqueEmail('login');
    await register(page, email);
    await expect(page).toHaveURL(/\/account$/);

    await page.getByRole('button', { name: 'Log out' }).click();
    await expect(page).toHaveURL('/');

    // After logout, /account redirects to /login.
    await page.goto('/account');
    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible();

    // Logging back in works and restores the session.
    await login(page, email);
    await expect(page).toHaveURL(/\/account$/);
    await expect(page.getByRole('heading', { name: 'Hi, Jane' })).toBeVisible();
  });

  test('shows a generic error for wrong credentials', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Email').fill('nobody@example.com');
    await page.getByLabel('Password').fill('WrongPassword1');
    await page.getByRole('button', { name: 'Log In' }).click();
    await expect(page.getByText(/invalid email or password/i)).toBeVisible();
  });

  test('protected routes redirect to login with returnTo, then return after login', async ({ page }) => {
    const email = uniqueEmail('return');
    await register(page, email);
    await expect(page).toHaveURL(/\/account$/);
    await page.getByRole('button', { name: 'Log out' }).click();
    await expect(page).toHaveURL('/');

    await page.goto('/account/orders');
    await expect(page).toHaveURL(/\/login$/);
    await login(page, email);
    await expect(page).toHaveURL(/\/account\/orders/);
  });

  test('the session survives a full browser reload', async ({ page }) => {
    const email = uniqueEmail('persist');
    await register(page, email);
    await expect(page).toHaveURL(/\/account$/);

    await page.reload();
    await expect(page).toHaveURL(/\/account$/);
    await expect(page.getByRole('heading', { name: 'Hi, Jane' })).toBeVisible();
  });
});
