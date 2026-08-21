import { test, expect } from '@playwright/test';

test.describe('storefront browsing', () => {
  test('renders the home hero and main navigation', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: /Where Fun Meets/ })).toBeVisible();
    await expect(page.getByRole('link', { name: '🧸 ToyBox' }).first()).toBeVisible();
    await expect(page.getByRole('link', { name: 'Toys', exact: true })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Wishlist', exact: true })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Orders', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Shop Now' })).toBeVisible();
  });

  test('lists products on /products with working cards', async ({ page }) => {
    await page.goto('/products');
    await expect(page.getByRole('heading', { name: 'All Toys' })).toBeVisible();
    // Kids is the default age group, so a known kids product must be listed.
    await expect(page.getByText('Hero Squad Action Pack').first()).toBeVisible();
    const cards = page.getByRole('button', { name: 'Add to Cart' });
    expect(await cards.count()).toBeGreaterThan(5);
  });

  test('navigates to the product detail page from a card', async ({ page }) => {
    await page.goto('/products');
    await page.getByText('Hero Squad Action Pack').first().click();
    await expect(page).toHaveURL(/\/product\/1$/);
    await expect(page.getByRole('heading', { name: 'Hero Squad Action Pack' })).toBeVisible();
  });

  test('shows the right products on a category page', async ({ page }) => {
    await page.goto('/category/action-figures');
    await expect(page.getByRole('heading', { name: /Action Figures/ })).toBeVisible();
    await expect(page.getByText('Hero Squad Action Pack').first()).toBeVisible();
  });

  test('shows a friendly empty state for an unknown category', async ({ page }) => {
    await page.goto('/category/does-not-exist');
    await expect(page.getByRole('heading', { name: /Category not found/ })).toBeVisible();
  });

  test('shows products for a brand page', async ({ page }) => {
    await page.goto('/brand/playtime');
    await expect(page.getByRole('heading', { name: /PlayTime/ })).toBeVisible();
    await expect(page.getByText('Hero Squad Action Pack').first()).toBeVisible();
  });

  test('searches from the search page and persists the query in the URL', async ({ page }) => {
    await page.goto('/search');
    await page.getByPlaceholder('Search products...').fill('robot');
    await page.getByRole('button', { name: 'Search', exact: true }).click();
    await expect(page).toHaveURL(/\/search\?q=robot$/);
    await expect(page.getByRole('heading', { name: /Search results for "robot"/ })).toBeVisible();
    await expect(page.getByText('Junior Robot Builder Kit').first()).toBeVisible();
  });

  test('shows an empty-results state for a search with no matches', async ({ page }) => {
    await page.goto('/search?q=zzz-no-such-toy');
    await expect(page.getByRole('heading', { name: 'No products found' })).toBeVisible();
  });

  test('renders the 404 page for unknown routes', async ({ page }) => {
    await page.goto('/this-route-does-not-exist');
    await expect(page.getByRole('heading', { name: /wandered away/ })).toBeVisible();
    await expect(page.getByText('404')).toBeVisible();
  });
});
