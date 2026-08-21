import { test, expect } from '@playwright/test';
import { addProductsToCart, fillCard, fillShipping } from './helpers';

test.describe('persistence across reloads', () => {
  test('keeps the cart after a refresh', async ({ page }) => {
    await addProductsToCart(page, [1, 2]);
    await page.reload();
    await expect(page.getByRole('button', { name: 'Open cart (2 items)' })).toBeVisible();
    await page.goto('/cart');
    await expect(page.getByText('Hero Squad Action Pack').first()).toBeVisible();
    await expect(page.getByText('Adventure Quest Board Game').first()).toBeVisible();
  });

  test('keeps the wishlist after a refresh', async ({ page }) => {
    await page.goto('/product/1');
    await page.getByRole('button', { name: 'Add to wishlist' }).click();
    await page.reload();
    await expect(page.getByRole('button', { name: 'Remove from wishlist' })).toBeVisible();
  });

  test('keeps the theme after a refresh', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Switch to dark mode' }).click();
    await expect(page.getByRole('button', { name: 'Switch to light mode' })).toBeVisible();
    await page.reload();
    await expect(page.getByRole('button', { name: 'Switch to light mode' })).toBeVisible();
  });

  test('keeps placed orders after a refresh', async ({ page }) => {
    await addProductsToCart(page, [1]);
    await page.goto('/checkout/shipping');
    await fillShipping(page);
    await page.getByRole('button', { name: 'Continue to Payment' }).click();
    await fillCard(page);
    await page.getByRole('button', { name: 'Review Order' }).click();
    await page.getByRole('button', { name: /Place Order/ }).click();
    await expect(page.getByRole('heading', { name: 'Order Confirmed! 🎉' })).toBeVisible();
    const orderId = page.url().split('/').pop() ?? '';

    await page.reload();
    // The confirmation banner is transient (router state), but the order itself persists.
    await expect(page.getByText(orderId).first()).toBeVisible();
    await page.goto('/orders');
    await expect(page.getByText('1 order')).toBeVisible();
  });
});
