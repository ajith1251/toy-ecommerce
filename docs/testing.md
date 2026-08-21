# Testing

ToyBox uses two complementary test stacks:

| Layer | Tool | Command |
| ----- | ---- | ------- |
| Frontend unit / component / integration | Vitest + React Testing Library + jsdom + jest-axe | `npm test`, `npm run test:watch`, `npm run test:coverage` |
| Backend API / repository | Vitest + supertest against a real isolated PostgreSQL database | `npm run server:test` |
| End-to-end (full stack) | Playwright (Chromium) + @axe-core/playwright | `npm run test:e2e` |

See [docs/testing-strategy.md](testing-strategy.md) for the philosophy,
pyramid, mocking rules, and quality gates.

## Where tests live

Tests sit next to the code they cover, mirroring the architecture:

```text
src/
├── lib/            storage.test.ts, validation.test.ts
├── services/       productService, cartService, wishlistService, recentService,
│                   orderService, checkoutService (.test.ts)
├── hooks/          useCart, useCheckoutFlow, useTheme, useToast, useWishlist (…)
├── utils/          productFilters, productFilters.edge, orderCalculations, orderId (.test.ts)
├── context/        ShopProvider.test.tsx (provider integration)
├── pages/          ProductsPage.test.tsx (URL-state integration)
├── components/     ui/Button, ui/Input, ui/Modal, ui/Toast, ui/Breadcrumbs,
│                   ui/ProductCard, ui/EmptyState, ui/PageLoader, ErrorBoundary (.test.tsx)
└── test/           setup.ts (global mocks + per-test isolation),
                   fixtures.ts (makeToy / makeCartItem), utils.tsx (render helpers + axe),
                   routing.test.tsx (full route-table suite)
e2e/
├── helpers.ts      fillShipping / fillCard / addProductsToCart / goToReviewStep
├── journey.spec.ts        critical purchase journey (home → order details)
├── storefront.spec.ts     home, listing, category, brand, search, 404
├── product.spec.ts        detail page, add to cart, quantity, wishlist
├── cart.spec.ts           cart page + drawer operations, empty state
├── checkout.spec.ts       full flow, guards, cart-changed, duplicate submit
├── orders.spec.ts         history, details, not-found
├── persistence.spec.ts    cart / wishlist / theme / orders across reloads
├── routing.spec.ts        deep links, URL state, back/forward, refresh
└── accessibility.spec.ts  axe scans of key routes
```

## Conventions

- **Unit tests** for pure logic (services, utils, storage): no renderer.
- **Hook tests** via `renderHook`; `useCheckoutFlow` uses a small harness that
  binds the hook to the real ShippingForm/PaymentForm/OrderReview.
- **Component tests** assert behavior and accessibility (labels, roles,
  `aria-*`, axe), not markup snapshots.
- **Routing tests** render the real route table through
  `createMemoryRouter(appRoutes)` wrapped in `ShopProvider` — never a mock
  router.
- `framer-motion` is mocked globally in `src/test/setup.ts` (renders as plain
  DOM); `window.matchMedia` is polyfilled; `localStorage` is cleared after
  every test.
- Seed persisted state with the app's own storage keys/constants so tests
  reflect real persistence (`seedStorage` helper in `src/test/utils.tsx`).
- Accessibility: `expectNoViolations(container)` (from `src/test/utils.tsx`)
  runs axe over a rendered component.

## Coverage map

| Area | File(s) |
| ---- | ------- |
| Filtering & sorting | `utils/productFilters.test.ts` + `productFilters.edge.test.ts` — search, category, brand, age, price boundaries, rating, stock, every sort, non-mutation, stable sorts, combined filters, empty/single products |
| Pricing | `utils/orderCalculations.test.ts` — empty cart, one/many items, quantities, free-shipping threshold (below / at / above), decimal prices, large quantities, arithmetic consistency, `formatMoney` |
| Storage | `lib/storage.test.ts` — valid/malformed/missing JSON, type guards, removal, unavailable storage |
| Validation | `lib/validation.test.ts` — every primitive (email, Luhn card, expiry, CVV, phone, postal, UPI) + shipping/payment domain validators, boundaries, whitespace |
| Cart | `services/cartService.test.ts` + `hooks/useCart.test.ts` — add, increment, update, remove, drop-to-zero, malformed/legacy persisted carts |
| Wishlist | `services/wishlistService.test.ts` — toggle, remove, membership, persistence, sanitization |
| Recently viewed | `services/recentService.test.ts` — ordering, dedupe, max size (5), persistence, malformed data, determinism |
| Orders | `services/orderService.test.ts` — build, unique ids, sanitization, legacy migration, **no CVV/full card persisted**, delivery estimation |
| Checkout service | `services/checkoutService.test.ts` — drafts, cart fingerprints, safe payment snapshots |
| Checkout flow | `hooks/useCheckoutFlow.test.tsx` — step progression, invalid blocks, full walk (card/UPI/COD), duplicate submit, cart-changed, empty-cart, draft restore without secrets, back navigation |
| Order ids | `utils/orderId.test.ts` — format + uniqueness |
| Theme / toasts | `hooks/useTheme.test.ts`, `hooks/useToast.test.ts` — persistence, toggle, system theme, auto-dismiss |
| Provider | `context/ShopProvider.test.tsx` — cart/wishlist/theme/toasts/recent/quick-view/reorder integration |
| Products URL state | `pages/ProductsPage.test.tsx` — `?category=`, `?sort=`, `?q=` drive the grid |
| Routing | `test/routing.test.tsx` — route/guard/navigation suite incl. `/products` URL params |
| Components | `components/ui/*.test.tsx` + `components/ErrorBoundary.test.tsx` — behavior + jest-axe |
| E2E | `e2e/*.spec.ts` — journey, storefront, product, cart, checkout, orders, persistence, routing, accessibility |

## Accessibility testing

- **Component level:** `jest-axe` via `expectNoViolations()` on Modal,
  ProductCard, Toast, Breadcrumbs, EmptyState, ErrorState (structural/ARIA).
- **Page level:** `e2e/accessibility.spec.ts` runs `@axe-core/playwright`
  over every major route and fails on **critical** violations. Serious
  color-contrast rules are reported manually (jsdom can't compute colors).
- **Fixed during Phase 5 (a11y bugs found by tests):**
  - `SortSelect` `<select>` had no accessible name → `aria-label="Sort products"`.
  - `SearchBar` clear button, `ActiveFilters` chip-remove buttons, and
    `CartDrawer` icon buttons had no accessible names → labeled.

## Backend tests (`server/tests/`)

Since Phase 6 the API is tested against a **real PostgreSQL** database, not
mocked SQL. `npm run server:test` (or `cd server && npm test`) boots an
isolated embedded Postgres cluster on a random port, runs migrations + seed,
and executes the supertest suites against a fresh app per file:

```text
server/tests/
├── global-setup.ts    one-time embedded Postgres boot + migrate + seed
├── helpers.ts         app factory, seeded catalog fixtures, http() helper
├── products.test.ts   list/filters/sort/pagination, by id + slug, invalid ids
├── categories.test.ts list, by slug, invalid slug
├── brands.test.ts     list, by slug, invalid slug
├── orders.test.ts     create (happy path), price calculation, invalid product /
│                     quantity / stock, insufficient stock, atomic stock
│                     decrement, order number uniqueness, list/get, 404s,
│                     payment snapshot safety (card → last4 only)
├── cart.test.ts       add/update/remove/clear, persistence across requests,
│                     client-id scoping, validation
├── wishlist.test.ts   add/remove/list, scoping
└── health.test.ts     health + db connectivity
```

74 backend tests cover the repositories, services (pricing, inventory,
orders), validation schemas, middleware, and every endpoint. Tests never
share state with the dev database — each run uses its own throwaway
Postgres cluster under `server/.pgdata-test` (deleted after the suite
finishes) or the configured `TEST_DATABASE_URL`.

## Full-stack E2E

`npm run test:e2e` starts the **whole stack**: the backend (fresh
`toybox_e2e` database — drop → migrate → seed → API on `:4000`) plus the
production frontend build on `:4173`, then runs Playwright against it. The
critical purchase journey therefore exercises browser → React → API →
Express → PostgreSQL (products load from the API, orders are validated,
priced and stored by the server, order history reads from the database).
The E2E Postgres instance is self-healing: stale servers from aborted runs
are cleaned up automatically before each launch.

## Running

```bash
npm test             # frontend unit + component + integration, once
npm run test:watch   # watch mode
npm run test:coverage# frontend with v8 coverage report + thresholds
npm run server:test  # backend suite (real isolated PostgreSQL)
npm run test:e2e     # full-stack Playwright (backend + production build)
npm run verify       # frontend lint + unit + build (fast pre-commit gate)
```

Frontend coverage thresholds live in `vite.config.ts` (statements/functions/
lines 75%, branches 60%) and are enforced by `npm run test:coverage`.
