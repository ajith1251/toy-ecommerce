# Architecture

ToyBox is a route-driven React application powered by **react-router-dom v7**,
organized into clean layers:

```
UI (pages / components)
        ↓
Hooks / State (useAuth, useShop, useCart, useCheckoutFlow, …)
        ↓
Services (productService, cartService, wishlistService, recentService,
          orderService, checkoutService, authService)
        ↓
Data Access Boundary (lib/api → REST API · lib/storage → localStorage)
        ↓
Express API → services → repositories → PostgreSQL (see docs/backend-architecture.md)
```

See [frontend-architecture.md](frontend-architecture.md) for the full layer
map, [data-access.md](data-access.md) for the service layer, and
[state-management.md](state-management.md) for state ownership.

## Routing

- `src/routes.tsx` exports the single `appRoutes` route table (`RouteObject[]`),
  shared by the browser app (`BrowserRouter` + `useRoutes`) and the test suite
  (`createMemoryRouter`).
- `App.tsx` is a thin shell: `ErrorBoundary` → `BrowserRouter` →
  `AuthProvider` → `ShopProvider` → `AppRoutes`. `AuthProvider` boots the
  session via `GET /api/auth/me`; `RequireAuth` wraps the account routes.
- `Layout` renders the chrome (Navbar, `<Outlet/>`, Footer, cart drawer,
  quick-view modal, toasts).
- `/products` supports shareable URL state (`?category=`, `?brand=`, `?sort=`,
  `?q=`) — see ADR-005.

## State Management

There is no global state library. `AuthProvider` owns the session and
`ShopProvider` composes the shop state hooks, exposing them through contexts
(`useAuth()` / `useShop()`):

| Hook         | Responsibility                          | Persisted via              |
| ------------ | --------------------------------------- | -------------------------- |
| `useAuth`    | Session status + user (AuthProvider)    | HttpOnly session cookie    |
| `useCart`    | Cart items, quantities, subtotal        | server cart (auth) / `toybox-cart` (guest) |
| `useFilters` | Search, category, brand, price, rating  | `lib/storage` (`toybox-filters`) |
| `useTheme`   | Dark / light theme                      | `lib/storage` (`toybox-theme`) |
| `useWishlist`| Wishlist ids                            | server wishlist (auth) / `toybox-wishlist` (guest) |
| `useToast`   | Toast notifications                     | (in-memory)                |

Recently-viewed ids (recentService), the quick-view modal state, `markViewed`
and `reorder` also live in the provider. Orders are **not** held in provider
state — every page reads them through `orderService`. On login/registration
`ShopProvider` merges the guest cart/wishlist into the account
(`POST /api/auth/merge`) and switches to server-backed state; `cartReady`
prevents empty-cart redirects while the server cart hydrates.

## Data access

All catalog access goes through **`productService`** (products, categories,
brands, age groups) — no page imports `data/products.ts` directly. All
`localStorage` access goes through **`lib/storage`** (a safe, typed wrapper)
with keys centralized in `constants/storage.ts` (see ADR-002). The future
backend migration swaps `productService` internals for an API client without
touching callers.

## Product filtering — single source of truth

`utils/productFilters.ts` holds the pure filtering/sorting engine
(`filterAndSortProducts`, `getAvailableBrands`, `getPriceRange`,
`countActiveFilters`, `slugify`/`findBrandBySlug`). Every listing page derives
results from it — no page re-implements filtering. Covered by
`utils/productFilters.test.ts` across every filter dimension and combinations.

## Checkout state

`useCheckoutFlow` is the single source of truth for the checkout state
machine: draft boot/restore, step, shipping/payment form state, validation
handlers, cart-change detection and the duplicate-submission guard. The
route-driven `CheckoutPage` consumes it (the old modal variant was removed in
Phase 4; its tests were ported to `hooks/useCheckoutFlow.test.tsx`). The route
owns the step segment (`/checkout/:step`) and enforces guards (empty cart →
`/cart`, incomplete shipping/payment → earliest step).

## Services & Utilities

```
services/productService.ts   catalog data-access boundary (products, categories, brands, age groups)
services/cartService.ts      cart item operations + persistence
services/wishlistService.ts  wishlist operations + persistence
services/recentService.ts    recently-viewed cap/dedupe + persistence
services/orderService.ts     order persistence (get/save/clear), buildOrder, sanitization, delivery estimates
services/checkoutService.ts  checkout draft persistence, cart fingerprints, safe payment snapshotting
utils/orderCalculations.ts   calcTotals() + formatMoney() — single source of truth for pricing
utils/orderId.ts             TBX-YYYYMMDD-XXXXXX order id generation
utils/productFilters.ts      pure filtering/sorting engine (single source of truth)
lib/validation.ts            pure validation functions (email, card, phone, postal, UPI, shipping, payment)
lib/storage.ts               safe typed localStorage wrapper
constants/checkout.ts        shipping threshold, fees, tax rate, currency, delivery window
constants/storage.ts         centralized localStorage keys
```

Services are plain modules (no React, no components), independently testable,
and persist exclusively through `lib/storage`.

## Pricing

`calcTotals(items)` is the single source of truth for subtotal, discount,
shipping, tax, and grand total — shared by cart, checkout, review and stored
orders (ADR-004). `formatMoney()` centralizes currency formatting. Pricing
uses the shared `OrderPricing` type from `types/order.ts` (no duplicate
pricing type).

```
subtotal  = Σ price × quantity
discount  = subtotal × DISCOUNT_RATE            (0 until promotions exist)
shipping  = 0 when subtotal ≥ FREE_SHIPPING_THRESHOLD, else SHIPPING_FEE
tax       = (subtotal − discount) × TAX_RATE
grandTotal = (subtotal − discount) + shipping + tax
```

## Component tree

```
App (ErrorBoundary → BrowserRouter)
└── ShopProvider
    └── AppRoutes (useRoutes — src/routes.tsx)
        └── Layout (Navbar, Footer, CartDrawer, QuickView modal, Toasts)
            ├── HomePage            (Hero, FilterBar, Categories, Featured, AllProducts, Recently Viewed, Newsletter)
            ├── ProductsPage        (ProductListing + URL params)
            ├── ProductDetailPage   (detail + related, via useParams)
            ├── CategoryPage        (ProductListing scoped to one category)
            ├── BrandPage           (ProductListing scoped to one brand)
            ├── SearchPage          (ProductListing driven by ?q=)
            ├── WishlistPage        (ProductCard grid)
            ├── CartPage            (items + calcTotals summary)
            ├── CheckoutPage        (useCheckoutFlow + step forms + OrderSummary)
            ├── OrdersPage          (OrderCard list from orderService)
            ├── OrderDetailsPage    (OrderDetails + confirmation banner)
            └── NotFoundPage        (404)
```

Shared UX primitives live in `components/ui/`: `Button` (variants + loading),
`Input`, `Modal`, `Badge`, `EmptyState`, `ErrorState`, `Skeleton`,
`PageLoader`, `Breadcrumbs`, `Toast`. Empty/not-found states across the app
are standardized on `EmptyState`; application errors are caught by the
`ErrorBoundary` → `ErrorState` fallback. See
[design-system.md](design-system.md).

## Testing

The test pyramid spans four layers (see [testing.md](testing.md) and
[testing-strategy.md](testing-strategy.md)):

1. **Unit/service** — pure logic tested beside the code (services, storage,
   validation, pricing, filtering, order ids) with no renderer.
2. **Hook/component** — `renderHook` for state hooks, a harness binding
   `useCheckoutFlow` to the real forms, and behavioral + jest-axe tests for
   shared UI primitives (`src/components/ui/*.test.tsx`,
   `src/components/ErrorBoundary.test.tsx`).
3. **Integration/routing** — `src/test/routing.test.tsx` renders the real
   `appRoutes` table through `createMemoryRouter` under the provider stack;
   `src/context/ShopProvider.test.tsx` and `src/pages/ProductsPage.test.tsx`
   cover provider composition and `/products` URL-state wiring;
   auth/account pages and `RequireAuth` are covered in
   `src/pages/*.test.tsx` + `src/components/RequireAuth.test.tsx`.
4. **E2E** — Playwright (Chromium) against the production build (`e2e/`):
   the critical purchase journey, storefront, product, cart, checkout,
   orders, persistence, routing, axe accessibility scans, plus auth flows
   (`auth.spec.ts`), the account area (`account.spec.ts`), guest cart &
   wishlist migration (`cart-migration.spec.ts`, `wishlist-migration.spec.ts`)
   and user-to-user isolation (`ownership.spec.ts`).

`src/test/fixtures.ts` provides toy/cart-item factories, `src/test/utils.tsx`
provides `renderWithRouter` / `renderWithShop` / `expectNoViolations` helpers,
and `src/test/setup.ts` mocks framer-motion, polyfills `matchMedia`, and
clears `localStorage` after every test. Coverage thresholds are enforced by
`npm run test:coverage`; `npm run verify` runs lint + unit + build.
