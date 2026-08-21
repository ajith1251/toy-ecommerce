import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('accessibility scans', () => {
  const pages = [
    ['/', 'home'],
    ['/products', 'product listing'],
    ['/product/1', 'product detail'],
    ['/category/action-figures', 'category page'],
    ['/search?q=robot', 'search results'],
    ['/cart', 'cart'],
    ['/wishlist', 'wishlist'],
    ['/orders', 'order history'],
    ['/no-such-page', '404 page'],
  ] as const;

  for (const [route, label] of pages) {
    test(`the ${label} page has no critical accessibility violations`, async ({ page }) => {
      await page.goto(route);
      await page.waitForLoadState('networkidle');
      const results = await new AxeBuilder({ page }).analyze();
      const critical = results.violations.filter(v => v.impact === 'critical');
      expect(
        critical,
        `Critical violations on ${route}: ${JSON.stringify(
          critical.map(v => ({ id: v.id, nodes: v.nodes.length }))
        )}`
      ).toEqual([]);
    });
  }
});
