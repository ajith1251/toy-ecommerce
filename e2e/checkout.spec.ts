import { test, expect } from '@playwright/test';
import { addProductsToCart, fillCard, fillShipping } from './helpers';

test.describe('checkout', () => {
  test('redirects to the cart when checkout starts with an empty cart', async ({ page }) => {
    await page.goto('/checkout/shipping');
    await expect(page).toHaveURL(/\/cart$/);
  });

  test('redirects an unknown checkout step to shipping', async ({ page }) => {
    await addProductsToCart(page, [1]);
    await page.goto('/checkout/nope');
    await expect(page).toHaveURL(/\/checkout\/shipping/);
  });

  test('blocks progression when shipping is invalid', async ({ page }) => {
    await addProductsToCart(page, [1]);
    await page.goto('/checkout/shipping');
    await page.getByRole('button', { name: 'Continue to Payment' }).click();
    await expect(page.getByRole('alert').first()).toBeVisible();
    await expect(page).toHaveURL(/\/checkout\/shipping$/);
    await expect(page.getByRole('button', { name: 'Continue to Payment' })).toBeVisible();
  });

  test('blocks progression when payment is invalid', async ({ page }) => {
    await addProductsToCart(page, [1]);
    await page.goto('/checkout/shipping');
    await fillShipping(page);
    await page.getByRole('button', { name: 'Continue to Payment' }).click();
    await page.getByRole('button', { name: 'Review Order' }).click();
    await expect(page.getByRole('alert').first()).toBeVisible();
    await expect(page).toHaveURL(/\/checkout\/payment$/);
  });

  test('accepts cash on delivery without payment credentials', async ({ page }) => {
    await addProductsToCart(page, [1]);
    await page.goto('/checkout/shipping');
    await fillShipping(page);
    await page.getByRole('button', { name: 'Continue to Payment' }).click();
    await page.getByRole('radio', { name: /Cash on Delivery/ }).check();
    await page.getByRole('button', { name: 'Review Order' }).click();
    await expect(page.getByRole('button', { name: /Place Order/ })).toBeEnabled();
  });

  test('blocks placement when the cart changes during checkout', async ({ page }) => {
    await addProductsToCart(page, [1, 2]);
    await page.goto('/checkout/shipping');
    await fillShipping(page);
    await page.getByRole('button', { name: 'Continue to Payment' }).click();
    await fillCard(page);
    await page.getByRole('button', { name: 'Review Order' }).click();
    await expect(page.getByRole('button', { name: /Place Order/ })).toBeEnabled();

    // Change the cart from the drawer while checkout is open.
    await page.getByRole('button', { name: /Open cart/ }).click();
    await page.getByRole('button', { name: 'Remove Adventure Quest Board Game from cart' }).click();
    await page.getByRole('button', { name: 'Close cart' }).click();

    await expect(page.getByText('Your cart has changed.')).toBeVisible();
    await expect(page.getByRole('button', { name: /Place Order/ })).toBeDisabled();

    await page.getByRole('button', { name: /Review updated cart/ }).click();
    await expect(page.getByRole('button', { name: /Place Order/ })).toBeEnabled();
  });

  test('places only one order on double submission', async ({ page }) => {
    await addProductsToCart(page, [1]);
    await page.goto('/checkout/shipping');
    await fillShipping(page);
    await page.getByRole('button', { name: 'Continue to Payment' }).click();
    await fillCard(page);
    await page.getByRole('button', { name: 'Review Order' }).click();

    // Fire two synchronous clicks — React has no chance to re-render between them.
    await page.evaluate(() => {
      const btn = [...document.querySelectorAll('button')].find(
        b => b.textContent?.includes('Place Order')
      ) as HTMLButtonElement | undefined;
      if (btn) {
        btn.click();
        btn.click();
      }
    });

    await expect(page.getByRole('heading', { name: 'Order Confirmed! 🎉' })).toBeVisible();
    await page.goto('/orders');
    await expect(page.getByText('1 order')).toBeVisible();
  });
});
