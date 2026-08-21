import { test, expect, type Page } from '@playwright/test';

const PASSWORD = 'Password123!';

function uniqueEmail(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 10000)}@example.com`;
}

async function register(page: Page, email: string): Promise<void> {
  await page.goto('/register');
  await page.getByLabel('First name').fill('Jane');
  await page.getByLabel('Last name').fill('Doe');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password', { exact: true }).fill(PASSWORD);
  await page.getByLabel('Confirm password').fill(PASSWORD);
  await page.getByRole('button', { name: 'Create Account' }).click();
  await expect(page).toHaveURL(/\/account$/);
}

test.describe('account area', () => {
  test('edits the profile name and phone', async ({ page }) => {
    const email = uniqueEmail('profile');
    await register(page, email);

    await page.getByRole('button', { name: /edit/i }).click();
    await page.getByLabel('First name').fill('Janet');
    await page.getByLabel('Last name').fill('Smith');
    await page.getByLabel('Phone').fill('+1 555 999 1111');
    await page.getByRole('button', { name: /save/i }).click();

    await expect(page.getByRole('heading', { name: 'Hi, Janet' })).toBeVisible();
    await expect(page.getByText('Janet Smith')).toBeVisible();
    await expect(page.getByText('+1 555 999 1111')).toBeVisible();
  });

  test('adds an address, marks it default, and edits it', async ({ page }) => {
    const email = uniqueEmail('addr');
    await register(page, email);

    await page.goto('/account/addresses');
    await expect(page.getByText('No saved addresses yet')).toBeVisible();

    await page.getByRole('button', { name: 'Add an address' }).click();
    await page.getByLabel('Label').fill('Home');
    await page.getByLabel('First name').fill('Jane');
    await page.getByLabel('Last name').fill('Doe');
    await page.getByLabel('Street address').fill('123 Toy Lane');
    await page.getByLabel('City').fill('Springfield');
    await page.getByLabel('State / province').fill('CA');
    await page.getByLabel('Postal code').fill('90210');
    await page.getByLabel('Country').fill('United States');
    await page.getByRole('button', { name: 'Save address' }).click();

    await expect(page.getByText('123 Toy Lane')).toBeVisible();
    await expect(page.getByText('Default', { exact: true })).toBeVisible(); // first address is default

    // Add a second address and promote it to default (header "Add" button).
    await page.getByRole('button', { name: 'Add' }).click();
    await page.getByLabel('Label').fill('Work');
    await page.getByLabel('First name').fill('Jane');
    await page.getByLabel('Last name').fill('Doe');
    await page.getByLabel('Street address').fill('99 Office Blvd');
    await page.getByLabel('City').fill('Chicago');
    await page.getByLabel('State / province').fill('IL');
    await page.getByLabel('Postal code').fill('60601');
    await page.getByLabel('Country').fill('United States');
    await page.getByRole('button', { name: 'Save address' }).click();

    await expect(page.getByText('99 Office Blvd')).toBeVisible();
    await page.getByRole('button', { name: /set default/i }).first().click();
    await expect(page.getByText('Default', { exact: true })).toHaveCount(1);

    // Edit the work address.
    await page.getByRole('button', { name: 'Edit Work' }).click();
    await page.getByLabel('Street address').fill('100 Office Blvd');
    await page.getByRole('button', { name: 'Save address' }).click();
    await expect(page.getByText('100 Office Blvd')).toBeVisible();

    // Delete one.
    await page.getByRole('button', { name: 'Delete Work' }).click();
    await expect(page.getByText('100 Office Blvd')).not.toBeVisible();
  });

  test('changes the password and logs in with the new one', async ({ page }) => {
    const email = uniqueEmail('security');
    await register(page, email);

    await page.goto('/account/security');
    await page.getByLabel('Current password').fill(PASSWORD);
    await page.getByLabel('New password', { exact: true }).fill('NewPassword456!');
    await page.getByLabel('Confirm new password').fill('NewPassword456!');
    await page.getByRole('button', { name: 'Update password' }).click();

    await expect(page.getByText(/password changed/i)).toBeVisible();

    // Old password stops working; new one does.
    await page.getByRole('button', { name: 'Log out' }).first().click();
    await expect(page).toHaveURL('/');

    await page.goto('/login');
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

  test('signs out everywhere from the security page', async ({ page }) => {
    const email = uniqueEmail('logoutall');
    await register(page, email);

    await page.goto('/account/security');
    await page.getByRole('button', { name: 'Log out everywhere' }).click();
    await expect(page).toHaveURL('/');

    await page.goto('/account');
    await expect(page).toHaveURL(/\/login/);
  });
});
