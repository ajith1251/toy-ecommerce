import { test, expect } from '@playwright/test';
import { fillCard, fillShipping } from './helpers';

/**
 * The single most important E2E test (Phase 5 spec §25): the complete
 * purchase journey from the home page through to order details.
 *
 *   Home → Products → Search → Product → Cart → Checkout
 *   (Shipping → Payment → Review → Place Order → Confirmation)
 *   → Order History → Order Details
 */
test('completes the critical purchase journey end to end', async ({ page }) => {
  // ── Home ─────────────────────────────────────────────────────────────
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /Where Fun Meets/ })).toBeVisible();

  // ── Products ─────────────────────────────────────────────────────────
  await page.getByRole('button', { name: 'Shop Now' }).click();
  await expect(page).toHaveURL(/\/products$/);
  await expect(page.getByRole('heading', { name: 'All Toys' })).toBeVisible();

  // ── Search ───────────────────────────────────────────────────────────
  await page.getByRole('link', { name: 'Search toys' }).click();
  await expect(page).toHaveURL(/\/search$/);
  await page.getByPlaceholder('Search products...').fill('robot');
  await page.getByRole('button', { name: 'Search', exact: true }).click();
  await expect(page).toHaveURL(/\/search\?q=robot$/);
  await expect(page.getByRole('heading', { name: /Search results for "robot"/ })).toBeVisible();

  // ── Product detail ───────────────────────────────────────────────────
  await page.getByText('Junior Robot Builder Kit').first().click();
  await expect(page).toHaveURL(/\/product\/\d+$/);
  await expect(page.getByRole('heading', { name: 'Junior Robot Builder Kit' })).toBeVisible();
  await expect(page.getByText('In Stock').first()).toBeVisible();

  // ── Add to cart ──────────────────────────────────────────────────────
  await page.getByRole('button', { name: 'Add to Cart' }).click();
  await expect(page.getByText('Junior Robot Builder Kit added to cart!')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Open cart (1 items)' })).toBeVisible();

  // ── Cart page ────────────────────────────────────────────────────────
  await page.goto('/cart');
  await expect(page.getByRole('heading', { name: /Your Cart/ })).toBeVisible();
  await expect(page.getByText('Junior Robot Builder Kit').first()).toBeVisible();

  // ── Checkout: shipping ───────────────────────────────────────────────
  await page.getByRole('button', { name: 'Checkout Now 🚀' }).click();
  await expect(page).toHaveURL(/\/checkout\/shipping$/);
  await fillShipping(page);
  await page.getByRole('button', { name: 'Continue to Payment' }).click();

  // ── Checkout: payment ────────────────────────────────────────────────
  await expect(page).toHaveURL(/\/checkout\/payment$/);
  await fillCard(page);
  await page.getByRole('button', { name: 'Review Order' }).click();

  // ── Checkout: review ─────────────────────────────────────────────────
  await expect(page).toHaveURL(/\/checkout\/review$/);
  await expect(page.getByText('Jane Doe').first()).toBeVisible();
  await expect(page.getByRole('button', { name: /Place Order/ })).toBeEnabled();

  // ── Place order → confirmation ───────────────────────────────────────
  await page.getByRole('button', { name: /Place Order/ }).click();
  await expect(page.getByRole('heading', { name: 'Order Confirmed! 🎉' })).toBeVisible();
  const orderId = page.url().split('/').pop() ?? '';
  expect(orderId).toMatch(/^TBX-\d{8}-[A-Z0-9]{6}$/);

  // ── Order history ────────────────────────────────────────────────────
  await page.getByRole('link', { name: 'View All Orders' }).click();
  await expect(page).toHaveURL(/\/orders$/);
  await expect(page.getByRole('heading', { name: 'Order History' })).toBeVisible();
  await expect(page.getByText('1 order')).toBeVisible();
  await expect(page.getByText(orderId).first()).toBeVisible();

  // ── Order details ────────────────────────────────────────────────────
  await page.getByText(orderId).first().click();
  await expect(page).toHaveURL(new RegExp(`/orders/${orderId}$`));
  await expect(page.getByText(orderId).first()).toBeVisible();
  await expect(page.getByText('Junior Robot Builder Kit').first()).toBeVisible();
  await expect(page.getByText('Jane Doe').first()).toBeVisible();
  await expect(page.getByText('confirmed').first()).toBeVisible();
});
