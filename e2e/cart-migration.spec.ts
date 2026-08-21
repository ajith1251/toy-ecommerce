import { test, expect } from '@playwright/test';
import { fillCard } from './helpers';

const PASSWORD = 'Password123!';

function uniqueEmail(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 10000)}@example.com`;
}

test.describe('guest → account migration', () => {
  test('guest cart follows the account, checkout uses a saved address, and the order survives logout/login', async ({ page }) => {
    const email = uniqueEmail('journey');

    // 1. Guest browses and adds a product to the cart.
    await page.goto('/product/1');
    await page.getByRole('button', { name: 'Add to Cart' }).click();
    await page.getByText(/added to cart!/).waitFor();
    await page.goto('/cart');
    await expect(page.getByText('Hero Squad Action Pack')).toBeVisible();

    // 2. Register — the anonymous cart must migrate into the account.
    await page.goto('/register');
    await page.getByLabel('First name').fill('Jane');
    await page.getByLabel('Last name').fill('Doe');
    await page.getByLabel('Email').fill(email);
    await page.getByLabel('Password', { exact: true }).fill(PASSWORD);
    await page.getByLabel('Confirm password').fill(PASSWORD);
    await page.getByRole('button', { name: 'Create Account' }).click();
    await expect(page).toHaveURL(/\/account$/);

    // Cart still holds the migrated item — exactly once (no double-merge).
    await page.goto('/cart');
    await expect(page.getByText('Hero Squad Action Pack')).toBeVisible();
    await expect(page.getByText(/1 item/)).toBeVisible();

    // 3. Save an address for later.
    await page.goto('/account/addresses');
    await page.getByRole('button', { name: 'Add an address' }).click();
    await page.getByLabel('Label').fill('Home');
    await page.getByLabel('First name').fill('Jane');
    await page.getByLabel('Last name').fill('Doe');
    await page.getByLabel('Phone').fill('+1 555 123 4567');
    await page.getByLabel('Street address').fill('123 Toy Lane');
    await page.getByLabel('City').fill('Springfield');
    await page.getByLabel('State / province').fill('CA');
    await page.getByLabel('Postal code').fill('90210');
    await page.getByLabel('Country').fill('United States');
    await page.getByRole('button', { name: 'Save address' }).click();
    await expect(page.getByText('123 Toy Lane')).toBeVisible();

    // 4. Checkout with the saved address (only the email needs typing).
    await page.goto('/checkout/shipping');
    await page.getByRole('button', { name: 'Home' }).click();
    await page.getByLabel('Email').fill(email);
    await page.getByRole('button', { name: 'Continue to Payment' }).click();
    await fillCard(page);
    await page.getByRole('button', { name: 'Review Order' }).click();
    await page.getByRole('button', { name: /Place Order/ }).click();
    await expect(page.getByRole('heading', { name: 'Order Confirmed! 🎉' })).toBeVisible();
    const orderId = page.url().split('/').pop() ?? '';
    expect(orderId).toMatch(/^TBX-/);

    // 5. Order history shows the order (names appear on the details page).
    await page.getByRole('link', { name: 'View All Orders' }).click();
    await expect(page.getByRole('heading', { name: 'Order History' })).toBeVisible();
    await expect(page.getByText('1 order')).toBeVisible();
    await expect(page.getByText('1 item(s)')).toBeVisible();
    await page.getByRole('link', { name: new RegExp(orderId) }).click();
    await expect(page.getByText('Hero Squad Action Pack').first()).toBeVisible();

    // 6. Logout, login — the order must still be there.
    await page.getByRole('button', { name: 'Log out' }).click();
    await expect(page).toHaveURL('/');
    await page.goto('/login');
    await page.getByLabel('Email').fill(email);
    await page.getByLabel('Password').fill(PASSWORD);
    await page.getByRole('button', { name: 'Log In' }).click();
    await expect(page).toHaveURL(/\/account$/);

    await page.goto('/orders');
    await expect(page.getByText('1 order')).toBeVisible();
    await expect(page.getByText('1 item(s)')).toBeVisible();
    await page.getByRole('link', { name: new RegExp(orderId) }).click();
    await expect(page.getByText('Hero Squad Action Pack').first()).toBeVisible();
  });
});
