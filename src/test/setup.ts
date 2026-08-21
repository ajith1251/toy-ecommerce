import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import { CATEGORIES, PRODUCTS } from '../data/products';
import { __resetCatalogForTests, __seedCatalogForTests } from '../services/productService';
import { slugify } from '../utils/productFilters';

// ── Framer Motion mock ──────────────────────────────────────────────────────
// jsdom can't run real spring/opacity animations reliably and they add no
// value to behavior tests. Every motion.* element renders as its plain DOM
// tag (dropping animation-only props) and AnimatePresence renders children
// directly. Component tests can therefore assert on the real DOM.
vi.mock('framer-motion', async () => {
  const { createElement, Fragment } = await import('react');
  const DROP = new Set(['initial', 'animate', 'exit', 'transition', 'layout', 'whileHover', 'whileTap', 'style', 'key']);
  const make = (tag: string) => (props: Record<string, unknown>) => {
    const dom: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(props)) {
      if (!DROP.has(key)) dom[key] = value;
    }
    return createElement(tag as 'div', dom);
  };
  return {
    motion: { div: make('div'), section: make('section'), span: make('span'), p: make('p'), h2: make('h2') },
    AnimatePresence: ({ children }: { children?: unknown }) => createElement(Fragment, null, children as never),
  };
});

// jsdom does not implement matchMedia, but the app (useTheme, framer-motion)
// relies on it. Provide a minimal no-op implementation.
if (typeof window !== 'undefined' && !window.matchMedia) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }),
  });
}

// ── Catalog cache seeding ─────────────────────────────────────────────────
// Components read the product catalog synchronously through productService.
// The real app boots it from the API (CatalogBoundary); tests seed the same
// deterministic catalog in-memory so no jsdom test hits the network. The
// cache is reset after every test for isolation.
beforeEach(() => {
  const brands = Array.from(new Set(PRODUCTS.map(p => p.brand)))
    .sort()
    .map((name, i) => ({ id: i + 1, name, slug: slugify(name), description: '' }));
  __seedCatalogForTests({ products: PRODUCTS, categories: CATEGORIES, brands });
});

afterEach(() => {
  __resetCatalogForTests();
  cleanup();
  localStorage.clear();
});
