import { test, expect } from '@playwright/test';

test.describe('routing', () => {
  test('deep-links to every main route render correctly', async ({ page }) => {
    const cases: Array<[string, RegExp]> = [
      ['/products', /All Toys/],
      ['/product/1', /Hero Squad Action Pack/],
      ['/category/action-figures', /Action Figures/],
      ['/brand/playtime', /PlayTime/],
      ['/search?q=robot', /Search results for "robot"/],
      ['/wishlist', /My Wishlist|Your wishlist is empty/],
      ['/cart', /Your Cart|Your cart is empty/],
      ['/orders', /Order History|No orders yet/],
    ];
    for (const [route, heading] of cases) {
      await page.goto(route);
      await expect(page.getByRole('heading').first()).toBeVisible();
      await expect(page.getByRole('heading').first()).toHaveText(heading);
    }
  });

  test('keeps URL filter state on /products after a refresh', async ({ page }) => {
    await page.goto('/products?category=stem-toys&sort=price-asc');
    await page.reload();
    await expect(page).toHaveURL(/\/products\?category=stem-toys&sort=price-asc/);
    await expect(page.getByText('Junior Robot Builder Kit').first()).toBeVisible();
  });

  test('navigates back and forward between pages', async ({ page }) => {
    await page.goto('/products');
    await page.getByText('Hero Squad Action Pack').first().click();
    await expect(page).toHaveURL(/\/product\/1$/);

    await page.goBack();
    await expect(page).toHaveURL(/\/products/);
    await expect(page.getByRole('heading', { name: 'All Toys' })).toBeVisible();

    await page.goForward();
    await expect(page).toHaveURL(/\/product\/1$/);
    await expect(page.getByRole('heading', { name: 'Hero Squad Action Pack' })).toBeVisible();
  });

  test('keeps the search query in the URL on refresh', async ({ page }) => {
    await page.goto('/search?q=robot');
    await page.reload();
    await expect(page).toHaveURL(/\/search\?q=robot/);
    await expect(page.getByRole('heading', { name: /Search results for "robot"/ })).toBeVisible();
  });

  test('renders the 404 page and recovers via a link', async ({ page }) => {
    await page.goto('/no-such-page');
    await expect(page.getByRole('heading', { name: /wandered away/ })).toBeVisible();
    await page.getByRole('link', { name: 'Back to ToyBox' }).click();
    await expect(page).toHaveURL('/');
  });
});
