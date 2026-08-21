import { test, expect } from '@playwright/test';
import { addProductsToCart } from './helpers';

test.describe('cart', () => {
  test('shows the empty state when the cart has no items', async ({ page }) => {
    await page.goto('/cart');
    await expect(page.getByRole('heading', { name: 'Your cart is empty' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Start Shopping' })).toBeVisible();
  });

  test('adds, increments and removes items on the cart page', async ({ page }) => {
    await addProductsToCart(page, [1, 2]);
    await page.goto('/cart');
    await expect(page.getByRole('heading', { name: /Your Cart/ })).toBeVisible();

    // Increase quantity of the first item.
    await page.getByRole('button', { name: 'Increase quantity of Hero Squad Action Pack' }).click();
    await expect(page.getByRole('heading', { name: /2 items/ })).toBeVisible();

    // Remove the second item entirely.
    await page.getByRole('button', { name: 'Remove Adventure Quest Board Game from cart' }).click();
    await expect(page.getByText('Adventure Quest Board Game')).not.toBeVisible();
  });

  test('removes an item when its quantity drops to zero', async ({ page }) => {
    await addProductsToCart(page, [1]);
    await page.goto('/cart');
    await page.getByRole('button', { name: 'Decrease quantity of Hero Squad Action Pack' }).click();
    await expect(page.getByRole('heading', { name: 'Your cart is empty' })).toBeVisible();
  });

  test('opens the cart drawer from the navbar and checks out', async ({ page }) => {
    await addProductsToCart(page, [1]);
    await page.getByRole('button', { name: /Open cart/ }).click();
    await expect(page.getByRole('heading', { name: /Cart \(1\)/ })).toBeVisible();
    await page.getByRole('button', { name: 'Checkout Now 🚀' }).click();
    await expect(page).toHaveURL(/\/checkout\/shipping/);
  });

  test('updates quantities from the drawer and removes an item', async ({ page }) => {
    await addProductsToCart(page, [1, 2]);
    await page.getByRole('button', { name: /Open cart/ }).click();
    await page.getByRole('button', { name: 'Increase quantity of Hero Squad Action Pack' }).click();
    await expect(page.getByRole('button', { name: /Open cart \(3 items\)/ })).toBeVisible();

    await page.getByRole('button', { name: 'Remove Adventure Quest Board Game from cart' }).click();
    await expect(page.getByRole('button', { name: /Open cart \(2 items\)/ })).toBeVisible();
  });
});
