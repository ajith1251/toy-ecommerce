import { test, expect } from '@playwright/test';
import { addProductsToCart, fillCard, fillShipping } from './helpers';

async function placeOrder(page: import('@playwright/test').Page): Promise<string> {
  await addProductsToCart(page, [1]);
  await page.goto('/checkout/shipping');
  await fillShipping(page);
  await page.getByRole('button', { name: 'Continue to Payment' }).click();
  await fillCard(page);
  await page.getByRole('button', { name: 'Review Order' }).click();
  await page.getByRole('button', { name: /Place Order/ }).click();
  await expect(page.getByRole('heading', { name: 'Order Confirmed! 🎉' })).toBeVisible();
  return page.url().split('/').pop() ?? '';
}

test.describe('orders', () => {
  test('shows an empty history before any order is placed', async ({ page }) => {
    await page.goto('/orders');
    await expect(page.getByRole('heading', { name: 'No orders yet' })).toBeVisible();
  });

  test('lists a placed order in history and opens its details', async ({ page }) => {
    const orderId = await placeOrder(page);
    await page.getByRole('link', { name: 'View All Orders' }).click();
    await expect(page.getByRole('heading', { name: 'Order History' })).toBeVisible();
    await expect(page.getByText('1 order')).toBeVisible();
    await expect(page.getByText(orderId).first()).toBeVisible();

    await page.getByText(orderId).first().click();
    await expect(page).toHaveURL(new RegExp(`/orders/${orderId}$`));
    await expect(page.getByText(orderId).first()).toBeVisible();
    await expect(page.getByText('Hero Squad Action Pack').first()).toBeVisible();
    await expect(page.getByText('Jane Doe').first()).toBeVisible();
    await expect(page.getByText('confirmed').first()).toBeVisible();
  });

  test('shows a not-found state for an unknown order id', async ({ page }) => {
    await page.goto('/orders/TBX-00000000-NOPE00');
    await expect(page.getByRole('heading', { name: 'Order not found' })).toBeVisible();
  });
});
