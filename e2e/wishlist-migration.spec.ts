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

test.describe('wishlist migration', () => {
  test('guest wishlist merges into the account and duplicates collapse', async ({ page }) => {
    const email = uniqueEmail('wishmerge');

    // Account already has product 1 in the wishlist.
    await register(page, email);
    await page.goto('/product/1');
    await page.getByRole('button', { name: 'Add to wishlist' }).click();
    await page.goto('/wishlist');
    await expect(page.getByText('Hero Squad Action Pack')).toBeVisible();

    // Log out; as a guest, add products 1 (duplicate) and 2 (new).
    await page.getByRole('button', { name: 'Log out' }).click();
    await expect(page).toHaveURL('/');
    for (const id of [1, 2]) {
      await page.goto(`/product/${id}`);
      await page.getByRole('button', { name: 'Add to wishlist' }).click();
    }
    await page.goto('/wishlist');
    await expect(page.getByText('Adventure Quest Board Game')).toBeVisible();

    // Login — the guest wishlist {1, 2} unions with the account {1} to {1, 2}.
    await page.goto('/login');
    await page.getByLabel('Email').fill(email);
    await page.getByLabel('Password').fill(PASSWORD);
    await page.getByRole('button', { name: 'Log In' }).click();
    await expect(page).toHaveURL(/\/account$/);

    await page.goto('/wishlist');
    await expect(page.getByText('Hero Squad Action Pack')).toBeVisible();
    await expect(page.getByText('Adventure Quest Board Game')).toBeVisible();
    const hearts = page.getByRole('button', { name: /Remove .* from wishlist/ });
    await expect(hearts).toHaveCount(2);
  });

  test('wishlist is server-backed and survives logout/login', async ({ page }) => {
    const email = uniqueEmail('wishpersist');

    await register(page, email);
    await page.goto('/product/4');
    await page.getByRole('button', { name: 'Add to wishlist' }).click();
    await page.goto('/wishlist');
    await expect(page.getByText('Cuddly Bear Plush')).toBeVisible();

    await page.getByRole('button', { name: 'Log out' }).click();
    await expect(page).toHaveURL('/');

    // After logout the wishlist is empty (server data does not leak to guests).
    await page.goto('/wishlist');
    await expect(page.getByText('Your wishlist is empty')).toBeVisible();

    // Logging back in restores it.
    await page.goto('/login');
    await page.getByLabel('Email').fill(email);
    await page.getByLabel('Password').fill(PASSWORD);
    await page.getByRole('button', { name: 'Log In' }).click();
    await expect(page).toHaveURL(/\/account$/);
    await page.goto('/wishlist');
    await expect(page.getByText('Cuddly Bear Plush')).toBeVisible();
  });
});
