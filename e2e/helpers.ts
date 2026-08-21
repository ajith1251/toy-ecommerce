import type { Page } from '@playwright/test';

/** Fills the shipping form with valid data (labels mirror ShippingForm). */
export async function fillShipping(page: Page): Promise<void> {
  await page.getByLabel('First Name').fill('Jane');
  await page.getByLabel('Last Name').fill('Doe');
  await page.getByLabel('Email').fill('jane@example.com');
  await page.getByLabel('Phone').fill('+1 555 123 4567');
  await page.getByLabel('Address Line 1').fill('123 Toy Lane');
  await page.getByLabel('City').fill('Springfield');
  await page.getByLabel('State / Province').fill('CA');
  await page.getByLabel('Postal Code').fill('90210');
  await page.getByLabel('Country').fill('United States');
}

/** Fills the card form with a valid Luhn test card and a future expiry. */
export async function fillCard(page: Page): Promise<void> {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const year = String(now.getFullYear() + 2).slice(-2);
  await page.getByLabel('Cardholder Name').fill('Jane Doe');
  await page.getByLabel('Card Number').fill('4242 4242 4242 4242');
  await page.getByLabel('Expiry (MM/YY)').fill(`${month}/${year}`);
  await page.getByLabel('CVV').fill('123');
}

/** Adds the given product ids to the cart by visiting each detail page. */
export async function addProductsToCart(page: Page, ids: number[]): Promise<void> {
  for (const id of ids) {
    await page.goto(`/product/${id}`);
    await page.getByRole('button', { name: 'Add to Cart' }).click();
    await page.getByText(/added to cart!/).waitFor();
  }
}

/**
 * Walks checkout from /checkout/shipping to the review step using the
 * standard test address and card.
 */
export async function goToReviewStep(page: Page): Promise<void> {
  await page.goto('/checkout/shipping');
  await fillShipping(page);
  await page.getByRole('button', { name: 'Continue to Payment' }).click();
  await fillCard(page);
  await page.getByRole('button', { name: 'Review Order' }).click();
  await page.getByRole('button', { name: /Place Order/ }).waitFor();
}
