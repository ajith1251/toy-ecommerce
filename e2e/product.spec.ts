import { test, expect } from '@playwright/test';

test.describe('product detail', () => {
  test('renders a valid product with stock, price and actions', async ({ page }) => {
    await page.goto('/product/1');
    await expect(page.getByRole('heading', { name: 'Hero Squad Action Pack' })).toBeVisible();
    await expect(page.getByText('In Stock').first()).toBeVisible();
    await expect(page.getByRole('button', { name: 'Add to Cart' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Add to wishlist' })).toBeVisible();
  });

  test('shows a not-found state for an invalid product id', async ({ page }) => {
    await page.goto('/product/99999');
    await expect(page.getByRole('heading', { name: 'Product not found' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Explore Toys' })).toBeVisible();
  });

  test('shows a not-found state for a non-numeric id', async ({ page }) => {
    await page.goto('/product/not-a-number');
    await expect(page.getByRole('heading', { name: 'Product not found' })).toBeVisible();
  });

  test('adds a product to the cart and updates the cart badge', async ({ page }) => {
    await page.goto('/product/1');
    await page.getByRole('button', { name: 'Add to Cart' }).click();
    await expect(page.getByText('Hero Squad Action Pack added to cart!')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Open cart (1 items)' })).toBeVisible();
  });

  test('respects the selected quantity when adding to the cart', async ({ page }) => {
    await page.goto('/product/1');
    await page.getByRole('button', { name: 'Increase quantity' }).click();
    await page.getByRole('button', { name: 'Increase quantity' }).click();
    await page.getByRole('button', { name: 'Add to Cart' }).click();
    await expect(page.getByRole('button', { name: 'Open cart (3 items)' })).toBeVisible();
  });

  test('toggles the wishlist from the detail page', async ({ page }) => {
    await page.goto('/product/1');
    await page.getByRole('button', { name: 'Add to wishlist' }).click();
    await expect(page.getByRole('button', { name: 'Remove from wishlist' })).toBeVisible();

    await page.goto('/wishlist');
    await expect(page.getByRole('heading', { name: /Wishlist/ })).toBeVisible();
    await expect(page.getByText('Hero Squad Action Pack').first()).toBeVisible();
  });
});
