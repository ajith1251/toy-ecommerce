import { test, expect, type Page } from '@playwright/test';
import { fillCard } from './helpers';

const PASSWORD = 'Password123!';

function uniqueEmail(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 10000)}@example.com`;
}

async function register(page: Page, email: string, firstName: string): Promise<void> {
  await page.goto('/register');
  await page.getByLabel('First name').fill(firstName);
  await page.getByLabel('Last name').fill('Smith');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password', { exact: true }).fill(PASSWORD);
  await page.getByLabel('Confirm password').fill(PASSWORD);
  await page.getByRole('button', { name: 'Create Account' }).click();
  await expect(page).toHaveURL(/\/account$/);
}

async function login(page: Page, email: string): Promise<void> {
  await page.goto('/login');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(PASSWORD);
  await page.getByRole('button', { name: 'Log In' }).click();
  await expect(page).toHaveURL(/\/account$/);
}

async function logout(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Log out' }).click();
  await expect(page).toHaveURL('/');
}

test.describe('user-to-user isolation', () => {
  test('a user cannot see or open another user\'s order', async ({ page }) => {
    const emailA = uniqueEmail('ownerA');
    const emailB = uniqueEmail('ownerB');

    // User A places an order.
    await register(page, emailA, 'Alice');
    await page.goto('/product/1');
    await page.getByRole('button', { name: 'Add to Cart' }).click();
    await page.getByText(/added to cart!/).waitFor();
    await page.goto('/checkout/shipping');
    await page.getByLabel('First Name').fill('Alice');
    await page.getByLabel('Last Name').fill('Smith');
    await page.getByLabel('Email').fill(emailA);
    await page.getByLabel('Phone').fill('+1 555 123 4567');
    await page.getByLabel('Address Line 1').fill('1 Toy Lane');
    await page.getByLabel('City').fill('Springfield');
    await page.getByLabel('State / Province').fill('CA');
    await page.getByLabel('Postal Code').fill('90210');
    await page.getByLabel('Country').fill('United States');
    await page.getByRole('button', { name: 'Continue to Payment' }).click();
    await fillCard(page);
    await page.getByRole('button', { name: 'Review Order' }).click();
    await page.getByRole('button', { name: /Place Order/ }).click();
    await expect(page.getByRole('heading', { name: 'Order Confirmed! 🎉' })).toBeVisible();
    const orderId = page.url().split('/').pop() ?? '';
    expect(orderId).toMatch(/^TBX-/);

    // User B must not see or open that order.
    await logout(page);
    await register(page, emailB, 'Bob');

    await page.goto('/orders');
    await expect(page.getByRole('heading', { name: 'No orders yet' })).toBeVisible();

    await page.goto(`/orders/${orderId}`);
    await expect(page.getByRole('heading', { name: 'Order not found' })).toBeVisible();
  });

  test('carts and wishlists are isolated between accounts', async ({ page }) => {
    const emailA = uniqueEmail('cartA');
    const emailB = uniqueEmail('cartB');

    // User A: product 1 in cart, product 2 in wishlist.
    await register(page, emailA, 'Alice');
    await page.goto('/product/1');
    await page.getByRole('button', { name: 'Add to Cart' }).click();
    await page.getByText(/added to cart!/).waitFor();
    await page.goto('/product/2');
    await page.getByRole('button', { name: 'Add to wishlist' }).click();
    await page.goto('/cart');
    await expect(page.getByText('Hero Squad Action Pack')).toBeVisible();
    await page.goto('/wishlist');
    await expect(page.getByText('Adventure Quest Board Game')).toBeVisible();
    await logout(page);

    // User B: empty cart and wishlist.
    await register(page, emailB, 'Bob');
    await page.goto('/cart');
    await expect(page.getByText('Your cart is empty')).toBeVisible();
    await page.goto('/wishlist');
    await expect(page.getByText('Your wishlist is empty')).toBeVisible();

    // B adds their own product — A's data must not leak in.
    await page.goto('/product/3');
    await page.getByRole('button', { name: 'Add to Cart' }).click();
    await page.getByText(/added to cart!/).waitFor();
    await page.goto('/cart');
    await expect(page.getByText('Hero Squad Action Pack')).not.toBeVisible();
    await expect(page.getByText('Adventure Quest Board Game')).not.toBeVisible();
    await logout(page);

    // Back to A: cart and wishlist are intact.
    await login(page, emailA);
    await page.goto('/cart');
    await expect(page.getByText('Hero Squad Action Pack')).toBeVisible();
    await page.goto('/wishlist');
    await expect(page.getByText('Adventure Quest Board Game')).toBeVisible();
  });

  test('addresses are isolated between accounts', async ({ page }) => {
    const emailA = uniqueEmail('addrA');
    const emailB = uniqueEmail('addrB');

    await register(page, emailA, 'Alice');
    await page.goto('/account/addresses');
    await page.getByRole('button', { name: 'Add an address' }).click();
    await page.getByLabel('Label').fill('Home');
    await page.getByLabel('First name').fill('Alice');
    await page.getByLabel('Last name').fill('Smith');
    await page.getByLabel('Street address').fill('1 Alice Lane');
    await page.getByLabel('City').fill('Springfield');
    await page.getByLabel('State / province').fill('CA');
    await page.getByLabel('Postal code').fill('90210');
    await page.getByLabel('Country').fill('United States');
    await page.getByRole('button', { name: 'Save address' }).click();
    await expect(page.getByText('1 Alice Lane')).toBeVisible();
    await logout(page);

    await register(page, emailB, 'Bob');
    await page.goto('/account/addresses');
    await expect(page.getByText('No saved addresses yet')).toBeVisible();
    await expect(page.getByText('1 Alice Lane')).not.toBeVisible();
  });

  test('guest carts stay isolated from authenticated carts', async ({ page, browser }) => {
    const email = uniqueEmail('guestiso');
    // Guest adds product 1.
    await page.goto('/product/1');
    await page.getByRole('button', { name: 'Add to Cart' }).click();
    await page.getByText(/added to cart!/).waitFor();

    // A completely fresh guest (new context = new anonymous identity) sees an
    // empty cart — guest carts are scoped per client id.
    const fresh = await browser.newContext();
    const guest2 = await fresh.newPage();
    await guest2.goto('/cart');
    await expect(guest2.getByText('Your cart is empty')).toBeVisible();
    await fresh.close();

    // Registering keeps the guest cart (migrated, not lost).
    await page.goto('/register');
    await page.getByLabel('First name').fill('Jane');
    await page.getByLabel('Last name').fill('Doe');
    await page.getByLabel('Email').fill(email);
    await page.getByLabel('Password', { exact: true }).fill(PASSWORD);
    await page.getByLabel('Confirm password').fill(PASSWORD);
    await page.getByRole('button', { name: 'Create Account' }).click();
    await expect(page).toHaveURL(/\/account$/);
    await page.goto('/cart');
    await expect(page.getByText('Hero Squad Action Pack')).toBeVisible();
  });
});
