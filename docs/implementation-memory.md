# Implementation Memory — Phase 3 (Routing & Store Pages)

Running log of every completed task, the decisions made, the files touched, and
the verification results. Keep this up to date as later phases land so future
work can pick up exactly where this phase left off.

---

## Task 1 — Install react-router-dom ✅

- Ran `npm install react-router-dom` → **v7.18.2** (React 19 compatible).
- Added to `package.json` dependencies. No other dependencies added.

## Task 2 — Single source of truth for filtering ✅

**Why:** every listing page (home, `/products`, `/category/:slug`, `/brand/:slug`,
`/search`) needs the same filter/sort behavior; duplicating it would drift.

**What changed:**

- **New `src/utils/productFilters.ts`** — pure engine:
  - `filterAndSortProducts(products, filters)` (age group → search → category →
    price → brand → stock → rating → sort)
  - `getAvailableBrands`, `getPriceRange`, `countActiveFilters`
  - `slugify(value)` (`"Hot Wheels"` → `"hot-wheels"`) and
    `findBrandBySlug(brands, slug)` for brand routes
  - `FilterState` / `SortOption` types moved here (re-exported from the hook)
- **Modified `src/hooks/useFilters.ts`** — delegates to the pure functions;
  `defaultFilters` is now exported (used by pages that reset filters).

**Gotcha:** `FilterState`/`SortOption` were defined in `useFilters.ts`; they moved
to `productFilters.ts` and are re-exported so existing imports (`FilterBar`,
`MobileFilterDrawer`) still compile.

## Task 3 — `useCheckoutFlow` hook + CheckoutContainer refactor ✅

**Why:** the checkout state machine must be shared by the modal
(`CheckoutContainer`) and the route page (`CheckoutPage`) — never duplicated.

**What changed:**

- **New `src/hooks/useCheckoutFlow.ts`** — owns: draft boot/restore
  (`bootCheckoutFromDraft`, exported for the modal's initial step), shipping/
  payment form state, errors, cart fingerprint `snapshot`, `cartChanged`,
  `cartEmpty`, totals, all change handlers, continue/validation handlers,
  refresh-cart, and `handlePlaceOrder` (duplicate-submission guard +
  `PLACE_ORDER_DELAY_MS`). Props: `{ items, active, step, onStepChange,
  onClearCart, onOrderPlaced }` — `step` is controlled by the caller.
- **Modified `src/components/checkout/CheckoutContainer.tsx`** — now a thin UI
  wrapper over the hook. Behavior identical; its 11 tests pass unchanged.
- **Verification:** full suite re-run immediately after — 67/67 passed.

**Gotcha:** calling `useCheckoutFlow` inside a `useState` initializer is an
illegal hook call; the initial step is derived via the exported
`bootCheckoutFromDraft(items).step` instead.

## Task 4 — ShopContext / ShopProvider ✅

**Why:** routes need shared state (cart, wishlist, theme, toasts, filters,
recent, quick view) without prop drilling from a single App.

**What changed:**

- **New `src/context/ShopContext.ts`** — context + `useShop()` (throws if used
  outside provider). `ShopContextValue` interface documents every field.
- **New `src/context/ShopProvider.tsx`** — composes `useCart`, `useFilters`,
  `useTheme`, `useWishlist`, `useToast`; adds `recentIds`/`markViewed`,
  `quickViewToy`/`openQuickView`/`closeQuickView`, `addToCart` (loops quantity +
  toast), `reorder` (moves order items back to cart + toast). Value memoized.

**Gotcha:** `react-refresh/only-export-components` forbids mixing the provider
component and the `useShop` hook in one file — split into `ShopContext.ts`
(hook + context) and `ShopProvider.tsx` (component).

## Task 5 — UI component updates ✅

- **`Breadcrumbs`** → route-aware: crumb `{ label, to? }`; Home is a `Link to="/"`;
  crumbs with `to` render as `<Link>`, last crumb is plain text. `aria-label="Breadcrumb"`.
- **`ProductCard`** → image + title are `<Link to={/product/:id}>`; the eye
  button is now **Quick View** (`onQuickView` prop, `aria-label="Quick view …"`);
  wishlist button got accessible labels; dark-mode card styling added.
- **`AllProducts`** → `onViewProduct` → `onQuickView`; pagination now clamps via
  `safePage` during render (replaces a `setState`-in-effect that the
  `react-hooks/set-state-in-effect` lint rule rejects) — fixes out-of-range page
  after filters narrow results.
- **`FeaturedProducts`** → `onQuickView`, `viewAllTo` prop, "View all" is a real
  `Link` (default `/products`).
- **`RecentlyViewed`** → prop rename `onViewProduct` → `onQuickView`.
- **`Categories`** → cards are `Link to={/category/:slug}`.
- **`Hero`** → "Shop Now" / "View Catalog" navigate to `/products`.
- **`FilterBar`** → optional `showCategory` / `showBrand` (hidden on
  category/brand pages where the route fixes them).
- **`Navbar`** → consumes `useShop`; logo is a Link; desktop nav links
  Home/Toys/Wishlist(count badge)/Orders via `NavLink` with active state; search
  icon links to `/search`; age tabs set shared filters; category mega-menu and
  mobile menu link to `/category/:slug`; orders icon links to `/orders`.
- **`Footer`** → Shop column links are real routes; logo links home.
- **`ProductDetailModal`** → added "View Full Details" link (→ `/product/:id`,
  closes modal) so Quick View clearly defers to the canonical route.
- **New `OrderCard`** → extracted from OrderHistory; renders as `Link` (with
  `to`) or `button` (with `onClick`); status styles are module-local (not
  exported, to satisfy react-refresh).
- **`OrderHistory`** (modal) → reuses `OrderCard`; unchanged behavior.

## Task 6 — ProductListing component ✅

- **New `src/components/sections/ProductListing.tsx`** — optional title/subtitle,
  `FilterBar` + `AllProducts` + `MobileFilterDrawer` (owns its own drawer state).
  Props: `baseProducts`, `showCategory`, `showBrand`, `setFilterOverride`
  (pages intercept e.g. category changes → navigate to `/category/:slug`).
  Computes products/brands/priceRange/activeFilterCount locally via the shared
  pure functions. Home does NOT use it (it keeps its original section order).

## Task 7 — Page components (12) ✅

- **`HomePage`** — original composition preserved: Hero → FilterBar →
  Breadcrumbs → Categories → Featured → AllProducts → Recently Viewed →
  Newsletter + MobileFilterDrawer. Reads everything from `useShop`.
- **`ProductsPage`** — breadcrumbs + `ProductListing` over all products.
- **`ProductDetailPage`** — `/product/:id`; `useParams` + `Number()`; graceful
  "Product not found" (also for non-numeric ids); `markViewed` on mount;
  breadcrumbs Home/Toys/Category/Product; full detail layout (badges, rating,
  price, description, stock badge, quantity stepper, add-to-cart (disabled when
  out of stock), wishlist, trust badges, Product Information panel, related
  products via `FeaturedProducts`).
- **`CategoryPage`** — resolves `CATEGORIES` by slug; sets shared
  ageGroup+category from the route; `setFilterOverride` turns category changes
  into navigation; "Category not found" for unknown slugs.
- **`BrandPage`** — resolves brand via `findBrandBySlug`; anchors ageGroup +
  brand; "Brand not found" for unknown brands.
- **`SearchPage`** — `/search?q=…`; URL is the source of truth (syncs into
  shared `searchQuery`; typing pushes `?q=` back with `replace`); empty query →
  empty-search state WITH a working search form (input + Search button);
  results render through `ProductListing`.
- **`WishlistPage`** — grid of wishlist products, empty state, remove.
- **`CartPage`** — canonical cart: items (qty steppers, remove, move-to-wishlist),
  totals via `calcTotals`, "Continue Shopping", "Checkout Now".
- **`CheckoutPage`** — `/checkout/:step`; step derived from URL with a
  "flash" override for transient `processing`/`done`; guards (below);
  reuses `useCheckoutFlow` + ShippingForm/PaymentForm/OrderReview/OrderSummary/
  CheckoutProgress; after placement navigates to `/orders/:id`.
- **`OrdersPage`** — history via `orderService.getOrders()`; `OrderCard` list;
  empty state.
- **`OrderDetailsPage`** — `/orders/:id` via `orderService.getOrderById`;
  confirmation banner when `location.state.justPlaced`; `OrderDetails` reused
  (back → `/orders`, reorder via context); "Order not found" for unknown ids.
- **`NotFoundPage`** — 404 "Oops! This toy wandered away." with Framer Motion.

**Checkout guards (client-side, frontend demo):**
- Empty cart → redirect `/cart` (except during processing/done).
- `/checkout/payment` or `/checkout/review` with invalid shipping → `/checkout/shipping`.
- `/checkout/review` with invalid payment → `/checkout/payment`.
- Invalid step segment → `/checkout/shipping`.

**Gotcha:** the `markViewed` effect must depend on `shop.markViewed` (stable
callback), NOT the whole `shop` object — `markViewed` re-creates the `recentIds`
array, changing the context value identity and causing an infinite
effect→setState loop (seen live; fixed).

## Task 8 — routes.tsx + App.tsx ✅

- **New `src/routes.tsx`** — single `appRoutes` table (`RouteObject[]`):
  Layout route wrapping index/home + products, product/:id, category/:slug,
  brand/:slug, search, wishlist, cart, checkout/:step, orders, orders/:id, `*`.
  Shared by the browser app and the test suite (`createMemoryRouter`).
- **Modified `src/App.tsx`** — `BrowserRouter` → `ShopProvider` →
  `AppRoutes` (`useRoutes(appRoutes)`).
- **Modified `src/main.tsx`** — unchanged (App owns the router).
- **New `src/components/layout/Layout.tsx`** — Navbar, `<Outlet/>`, Footer,
  CartDrawer (checkout → `/checkout/shipping`, empty-cart toast), Quick View
  modal, ToastContainer.

**Gotcha:** `appRoutes` lives in its own file because `react-refresh` rejects
files exporting both components and non-components.

## Task 9 — Test infrastructure + routing suite ✅

- **`src/test/setup.ts`** — added a `window.matchMedia` polyfill (jsdom lacks it;
  `useTheme` and framer-motion need it). `localStorage` still cleared per test.
- **New `src/test/routing.test.tsx`** — 29 tests; renders the real route table
  via `createMemoryRouter(appRoutes)` wrapped in `ShopProvider`; framer-motion
  mocked (same pattern as `CheckoutContainer.test`). Covers: home, products,
  card→detail navigation, product detail, invalid/malformed product ids,
  category (+not-found), brand (+not-found), search results/empty, wishlist
  (+remove), cart (+move-to-wishlist), checkout guards (empty cart, incomplete
  shipping → shipping, invalid step), full checkout flow with fake timers to a
  persisted `/orders/TBX-…`, order history, order details (+not-found), 404,
  forward/back navigation, quick-view modal.

**Test-authoring gotchas learned:**
- `getByText` matches **direct text nodes only** (getNodeText), so hero text
  split across `<span>`s needs a different assertion.
- `/Category/` regex does not match the accessible name "All Categories".
- Same text in breadcrumb + heading → use `getAllByText(...).length > 0`.
- The synchronous infinite loop (Task 7) hung the suite until fixed.

## Task 10 — Documentation ✅

- **`README.md`** — Phase 3 section, route table, architecture, deep-link note.
- **`docs/architecture.md`** — rewritten for routing + shared single-sources.
- **`docs/roadmap.md`** — Phase 3 marked complete; future phases kept.
- **New `docs/routing.md`** — full route map, responsibilities, dynamic params,
  search params, checkout flow + guards, order routes, 404, navigation,
  state preservation, deep-link safety table, hosting note.

## Task 11 — Verification ✅

- `npm test` → **96/96 passed** (67 baseline + 29 routing).
- `npm run lint` → clean (0 problems).
- `npm run build` → clean (only Vite's advisory chunk-size warning, pre-existing).
- Browser verification (headless Chromium via the browser-automation skill
  against `vite preview`):
  - Home, `/products`, `/product/8`, `/category/action-figures`,
    `/brand/playtime`, `/search?q=robot`, `/cart`, `/wishlist`, `/orders`,
    `/checkout/shipping` (empty cart → redirects to `/cart`), `/product/999999`
    (not found), unknown route (404) — all HTTP 200, **0 console errors**,
    **0 failed requests** (only external unsplash image aborts = noise).
  - Full E2E: add to cart → `/cart` → checkout → shipping → payment → review →
    place order → redirected to `/orders/TBX-…` with confirmation banner +
    order details + reorder — all steps passed.
  - Quick view modal opens; "View Full Details" → `/product/1`; empty-search
    form submits `?q=lego`; browser back returns to empty search state.

**Environment quirk:** headless Chromium here does not perform implicit form
submission on Enter for a lone text input; `form.requestSubmit()` and an
explicit submit button both work. The empty-search state therefore has a real
Search button (better a11y anyway).

---

# Phase 4 — Frontend Architecture Refinement ✅

Running log for Phase 4 (layered architecture + design-system consolidation).

## Task 1 — Storage abstraction ✅

- **New `src/constants/storage.ts`** — every localStorage key in one registry
  (`toybox-cart`, `toybox-wishlist`, `toybox-recent`, `toybox-theme`,
  `toybox-filters`, `toybox-orders`, `toybox-checkout-draft`). No magic strings.
- **New `src/lib/storage.ts`** — safe typed wrapper: `get(key, fallback, guard?)`
  (JSON parse + optional type-guard validation), `set`, `getRaw`/`setRaw`,
  `remove`; never throws; degrades gracefully on missing/unparseable data.
- **Migrated every consumer** — `useCart`, `useWishlist`, `useTheme`,
  `useFilters`, `orderService`, `checkoutService`, and the old `lib/recent.ts`
  (deleted, replaced by `recentService`).
- `constants/checkout.ts` re-exports `ORDER_STORAGE_KEY`/`CHECKOUT_STORAGE_KEY`
  from `constants/storage.ts` for backwards compatibility with tests.

**Gotcha:** the original `useCart` filtered corrupted entries (kept valid ones)
rather than rejecting the whole array. `loadCart` keeps that forgiving
semantic; a single bad item never nukes the cart.

## Task 2 — Service layer ✅

- **New `src/services/productService.ts`** — data-access boundary for the
  catalog: `getProducts`, `getProductById`, `getProductsByCategory`,
  `getProductsByBrand`, `getProductsByAgeGroup`, `searchProducts`,
  `getCategories`, `getCategoryBySlug`, `getCategoriesByAgeGroup`,
  `getBrands`, `getBrandBySlug`, `getAgeGroupForBrand`. No page imports
  `data/products.ts` directly anymore.
- **New `src/services/cartService.ts`** — pure cart ops (`addCartItem`,
  `removeCartItem`, `updateCartQuantity`, `countCartItems`,
  `calcCartSubtotal`, `isCartItem`) + `loadCart`/`saveCart`.
- **New `src/services/wishlistService.ts`** — `toggleWishlistId`,
  `removeWishlistId`, `isWishlisted`, `loadWishlist`, `saveWishlist`.
- **New `src/services/recentService.ts`** — `MAX_RECENT_IDS` (5) centralized,
  deterministic dedupe (`addRecentId` moves id to front, caps, persists).
- Hooks are now thin: `useCart`/`useWishlist` hold state and delegate to
  services; `useFilters` reads the catalog via `productService`.
- Pages/components migrated off direct imports: Home, Products, Search,
  Category, Brand, Wishlist, ProductDetail, Navbar, FilterBar,
  MobileFilterDrawer, ShopProvider (reorder via `getProductById`).

## Task 3 — Types & pricing consolidation ✅

- `OrderTotals` (utils/orderCalculations.ts) was a duplicate of `OrderPricing`
  (types/order.ts) — identical shapes. `OrderTotals` is now an alias of
  `OrderPricing`; `calcTotals` returns the shared type. One pricing shape.
- Fixed an inline duplicate of `slugify` in `ProductDetailPage` (the brand
  link) — now imports `slugify` from `utils/productFilters`.
- Product/price displays use `formatMoney()` (centralized `CURRENCY`) instead
  of hardcoded `$` (ProductCard, ProductDetailPage, ProductDetailModal,
  CartDrawer).

## Task 4 — UX standardization (empty / error / loading) ✅

- **New `components/ui/EmptyState.tsx`** — icon, title, description, actions,
  `titleTag` (h1/h2/h3). All empty/not-found pages now use it (empty cart /
  wishlist / orders / search results, product/category/brand/order not-found)
  with the exact same copy as before (routing tests unchanged).
- **New `components/ui/ErrorState.tsx`** — user-friendly error with "Try
  Again" + optional footer; never raw stack traces.
- **New `components/ErrorBoundary.tsx`** — class boundary wrapping the app in
  `App.tsx`; fallback uses `ErrorState` + "Back to ToyBox" link.
- **New `components/ui/PageLoader.tsx`** — centered spinner for future async
  routes. **Button** gained a `loading` prop (inline spinner + disabled).
- No artificial loading delays were added (per spec).

## Task 5 — Design system + accessibility ✅

- **New `components/ui/Badge.tsx`** — `new` / `bestseller` / `sale` variants;
  replaces ad-hoc flag spans in ProductCard, ProductDetailPage,
  ProductDetailModal.
- **Button** — focus-visible ring, dark-mode variants (outline/ghost/secondary).
- **Modal** — `role="dialog"`, `aria-modal`, `aria-label`, Escape-to-close,
  initial focus on the panel.
- **FilterDropdown** — `aria-expanded`, `aria-haspopup`, `role="listbox"` +
  `role="option"`/`aria-selected` on options, dark-mode styles.
- **AllProducts pagination** — `aria-label` prev/next, `aria-current="page"`,
  `aria-label` per page.
- **Images** — `loading="lazy"` + `decoding="async"` on product grid, detail,
  drawer, summary, order thumbnails.
- **Removed dead code** — `CheckoutContainer.tsx`, `OrderHistory.tsx` (no app
  imports; documented as unused in Phase 3 notes) and
  `CheckoutContainer.test.tsx`. Its 11 tests were **ported** to
  `src/hooks/useCheckoutFlow.test.tsx` with a minimal harness binding the hook
  to the real ShippingForm/PaymentForm/OrderReview — coverage preserved without
  a dead component.

## Task 6 — URL state for /products ✅

- `ProductsPage` reads `?category=`, `?brand=`, `?sort=`, `?q=` and syncs them
  into the shared filter store when present; filter changes push back to the
  URL with `replace`. Other filters (age group, rating, price, stock) stay in
  the shared store — documented in ADR-005.
- Two new routing tests: `/products?category=action-figures` and
  `/products?q=robot`.

## Task 7 — New tests ✅

- `lib/storage.test.ts` — missing/malformed/valid data, persistence, removal,
  type guards, unavailable storage.
- `services/productService.test.ts` — products/categories/brands/age groups/
  search.
- `services/cartService.test.ts` + `services/wishlistService.test.ts` — pure
  ops + persistence sanitization.
- `utils/productFilters.test.ts` — every filter dimension (search, category,
  brand, age, price, rating, stock), every sort, combined filters, helpers.

## Task 8 — Documentation ✅

- **New:** `docs/frontend-architecture.md`, `docs/data-access.md`,
  `docs/state-management.md`, `docs/design-system.md`, `docs/testing.md`.
- **New ADRs:** `docs/decisions/ADR-001-react-router.md` …
  `ADR-005-url-state.md`.
- **Updated:** README (Phase 4 section, layered architecture, storage table),
  `docs/architecture.md`, `docs/roadmap.md`, `docs/routing.md`,
  `docs/checkout-flow.md`.

## Task 9 — Verification ✅

- `npm test` → **149/149 passed** (96 baseline + 53 new; 11 modal tests ported
  to hook level).
- `npm run lint` → clean (0 problems).
- `npm run build` → clean (only Vite's advisory chunk-size warning, pre-existing).

---

## Remaining issues / notes for Phase 5

- Production bundle exceeds Vite's 500 kB advisory warning — route-level
  `React.lazy` code-splitting is the fix, deferred because the routing suite
  asserts synchronously after render and lazy routes need async assertions
  (convert `getBy*` → `findBy*` when implementing).
- Route guards are client-side only (documented — frontend demo).
- The spec's example brand slugs (`/brand/lego`, `/brand/hot-wheels`) don't
  exist in the dataset and correctly show "Brand not found" (graceful).
- `minPrice`/`maxPrice` URL params deliberately not implemented (ADR-005).
- SEO metadata is minimal (semantic headings + product names); a full
  per-route `<title>`/meta system is future work once a backend/host exists.
- `ProductDetailModal` (Quick View) still duplicates some detail markup — kept
  because it's a distinct UX, but it's the largest remaining dedupe candidate.

## Verified final state

```
Build: ✓   Lint: ✓   Tests: 149/149 ✓   Console errors: 0 ✓
Layers: UI → hooks → services → lib/storage ✓   Direct localStorage in UI: none ✓
Direct data/products imports in UI: none ✓   Services: 6 (product, cart, wishlist, recent, order, checkout) ✓
URL state: /search?q=… and /products?category|brand|sort|q=… ✓
Empty/error states: EmptyState + ErrorState + ErrorBoundary ✓
Dead code removed: CheckoutContainer, OrderHistory, lib/recent.ts ✓
```

---

# Phase 5 — Testing & Quality Engineering ✅

Running log for Phase 5 (comprehensive testing & quality gates).

## Task 1 — Baseline + audit ✅

- Baseline before Phase 5: **149 tests / 13 files** (from Phase 4 verification).
- Audited coverage gaps vs the spec: missing `recentService` tests, no
  `validation.test.ts`, no component/a11y tests, no E2E, no coverage, no CI.

## Task 2 — Test infrastructure ✅

- **New dev deps:** `@vitest/coverage-v8`, `jest-axe` (+ `@types/jest-axe`),
  `@playwright/test`, `@axe-core/playwright`.
- **`vite.config.ts`** — coverage config: v8 provider, text/html/lcov
  reporters, `src/**/*.{ts,tsx}` include, exclusions (main, data, types, test,
  `*.test.*`), thresholds (stmts/funcs/lines 75%, branches 60%).
- **`src/test/setup.ts`** — global framer-motion mock (`motion.*` → plain DOM,
  `AnimatePresence` → Fragment), `matchMedia` polyfill, per-test `cleanup()`
  + `localStorage.clear()`.
- **`src/test/utils.tsx`** — `renderWithRouter`, `renderWithShop`,
  `expectNoViolations` (jest-axe), `seedStorage`.
  **Gotcha:** the file holds JSX so it must be `.tsx`; as `.ts` the oxc
  transform never enables JSX parsing and it failed at runtime.

## Task 3 — New unit/service tests ✅

- `services/recentService.test.ts` (9) — ordering, dedupe, max-5 cap,
  persistence, malformed data, determinism.
- `lib/validation.test.ts` (27) — every primitive (email, Luhn, expiry, CVV,
  phone, postal, UPI) + `validateShipping`/`validatePayment`/`hasErrors`.
- `utils/orderCalculations.test.ts` extended — exact threshold, decimal
  accumulation, large quantities, arithmetic consistency
  (`grandTotal = subtotal + shipping + tax`).
- `utils/productFilters.edge.test.ts` (34) — empty/single, non-mutation,
  stable sorts, bestseller/newest first, price boundaries, whitespace search,
  undefined query.
- **Bug fixed:** search treated whitespace-only as a real query → now trims
  (`(filters.searchQuery ?? '').trim()`).
- **Bug fixed (a11y):** `Toast` dismiss button had no accessible name →
  `aria-label="Dismiss notification"`.

## Task 4 — Hook + component + integration tests ✅

- `hooks/useTheme.test.ts` — load/persist/toggle/system-theme.
  **Bug found & fixed:** the mount effect persisted the initial theme, which
  permanently silenced the OS dark-mode listener (`!storage.getRaw(...)` was
  always false). Persistence now happens only inside `toggleTheme`, so the
  listener works until the user opts in; refresh persistence unchanged.
- `hooks/useToast.test.ts` — add/remove/auto-dismiss (fake timers; use
  `vi.setSystemTime` between adds or `Date.now()` ids collide).
- `context/ShopProvider.test.tsx` (6) — cart/wishlist/theme/toasts/recent/
  quick-view/reorder integration.
- `pages/ProductsPage.test.tsx` (5) — `?category=`, `?sort=`, `?q=` drive the
  grid; empty-state for no matches.
- Component behavior + jest-axe: `Button`, `Input`, `Modal` (escape, backdrop,
  focus, a11y), `Toast`, `Breadcrumbs`, `ProductCard` (badges, sale %, cart/
  wishlist/quick-view, a11y), `EmptyState`+`ErrorState`, `PageLoader`,
  `ErrorBoundary` (catch → friendly fallback → recover on retry).

## Task 5 — E2E (Playwright) ✅

- `playwright.config.ts` — testDir `e2e/`, Chromium only, baseURL
  `http://localhost:4173`, webServer builds + serves via `vite preview`
  (strictPort), CI: 2 retries + single worker + HTML report.
- `e2e/helpers.ts` — `fillShipping`, `fillCard`, `addProductsToCart`,
  `goToReviewStep`.
- 9 spec files / 49 tests: `journey` (critical purchase journey),
  `storefront`, `product`, `cart`, `checkout` (invalid forms, empty-cart
  redirect, cart-changed guard, double-submit → one order), `orders`,
  `persistence` (cart/wishlist/theme/orders across reloads), `routing`
  (deep links, URL state + refresh, back/forward), `accessibility` (axe,
  fail on critical).
- **A11y bugs found & fixed by the axe scans:** `SortSelect` `<select>` had
  no name → `aria-label="Sort products"`; `SearchBar` clear button and
  `ActiveFilters` chip-remove buttons icon-only → labeled; `CartDrawer` icon
  buttons unnamed → labeled (also unlocked E2E selectors).
- **Gotchas learned:** Playwright `name:` string matching is *substring* +
  case-insensitive → use `exact: true` for short names ("Search" vs "Clear
  search"); duplicate accessible names (navbar vs footer "ToyBox", "In Stock"
  badge vs `<dd>`) → scope or `.first()`; the cart drawer's backdrop
  intercepts clicks while open → close the drawer before clicking page
  buttons; my own regex typo "wondered" vs the real copy "wandered away".

## Task 6 — Quality gates + CI ✅

- `package.json` scripts: `test`, `test:watch`, `test:coverage`,
  `test:e2e`, `verify` (lint + unit + build), plus existing lint/build/dev.
- `.github/workflows/ci.yml` — `quality` job (npm ci → lint → test →
  coverage → build) and `e2e` job (playwright install chromium → test:e2e,
  report artifact on failure). Node 22, npm cache.

## Task 7 — Documentation ✅

- **New `docs/testing-strategy.md`** — pyramid, mocking rules, isolation,
  naming conventions, quality gates, regression suite, known limitations.
- **Rewritten `docs/testing.md`** — full Phase 5 layout (both stacks, file
  map, coverage map, a11y testing, bugs fixed).
- **Updated:** README (Phase 5 section, tech stack, commands, E2E note),
  `docs/architecture.md` (4-layer testing section),
  `docs/roadmap.md` (Phase 5 ✅; backend phase renumbered to 6).

## Task 8 — Verification ✅

- `npm test` → **271/271 passed** (28 files; baseline 149 → +122).
- `npm run test:coverage` → thresholds pass: statements **84.59%**,
  branches **74.18%**, functions **77.34%**, lines **85.59%**.
- `npm run lint` → clean (0 problems).
- `npm run build` → clean (only Vite's advisory chunk-size warning).
- `npm run test:e2e` → **49/49 passed** (Chromium, production build).

## Remaining issues / notes for Phase 6

- E2E runs Chromium only; cross-browser (WebKit/Firefox) is future work.
- Color-contrast rules are reported but not gated (jsdom can't compute
  colors; the axe E2E scan gates critical rules only).
- `verify` excludes E2E (browser cost) — CI runs it as a separate job.
- Production bundle still exceeds Vite's 500 kB advisory warning — route-level
  `React.lazy` code-splitting remains the fix (needs async routing
  assertions, `getBy*` → `findBy*`).
- The `useTheme` fix means the OS dark-mode preference is followed until the
  user explicitly toggles; refresh persistence still applies to the explicit
  choice (covered by unit + E2E tests).

---

# Phase 6 — Backend, Database & Real Persistence ✅

Running log for Phase 6 (Express + PostgreSQL backend, real persistence).

## Task 1 — Workspace + scaffolding ✅

- Root `package.json` became an npm workspace (`"workspaces": ["server"]`);
  new scripts: `server:dev`, `server:build`, `server:test`, `server:lint`,
  `db:migrate`, `db:seed`, `db:reset`.
- `server/` package (`toybox-server`): Express 5, pg, zod v4, cors, helmet,
  express-rate-limit, dotenv; dev deps tsx, supertest, vitest,
  **embedded-postgres** (real PostgreSQL 18, no Docker required).
- `server/tsconfig.json` + `server/vitest.config.ts` (global setup, isolated
  pools).

## Task 2 — Database layer ✅

- **Migrations** (`server/migrations/`): `001_create_catalog.sql`
  (categories, brands, products + product_categories), `002_create_orders.sql`
  (orders, order_items, status enum, stock, `order_number` unique),
  `003_create_cart_wishlist.sql` (carts, cart_items, wishlists). Applied by a
  `schema_migrations`-tracked runner; `scripts/db.ts` CLI: migrate / seed /
  reset.
- **`src/db/embedded.ts`** — embedded Postgres bootstrap with
  `initdb --encoding=UTF8` (Windows locale defaulted to WIN1252 and rejected
  emoji — real bug found), persistent dev data dir, connectivity check +
  wait-for-ready.
- **`src/db/pool.ts`** — pooled `pg.Pool` from `DATABASE_URL` (embedded
  default), graceful shutdown, forced client UTF-8.
- **Seed** (`server/seeds/seed.ts`) — deterministically transforms the
  existing `src/data/products.ts` (54 products, 52 categories, 53 brands) into
  PostgreSQL; idempotent (upsert by slug/name).
- **Gotchas:** deleting a data dir while its postmaster still runs corrupts
  the cluster; force-killed runs leave `postmaster.pid` → crash recovery on
  next boot (harmless but noisy); a sandbox `PORT=0` env var silently broke
  the API — config ignores non-positive ports.

## Task 3 — Backend core ✅

- `config.ts` (env, `DATABASE_URL`, `PORT`, CORS origins, rate limits),
  `types.ts` (domain types), `errors.ts` (`ApiError` + codes: NOT_FOUND,
  INSUFFICIENT_STOCK, CONFLICT, VALIDATION, …), zod schemas (`common`,
  `order`, `cart` — zod v4: `discriminatedUnion` has no `.strict()`).
- **Repositories:** `productRepository` (filters/sort/pagination in SQL —
  server-side filtering per spec), `catalogRepository`, `orderRepository`
  (transactional order + items + stock decrement with `FOR UPDATE` row locks),
  `cartRepository`, `wishlistRepository`. No SQL in controllers.
- **Services:** `catalogService`, `orderService` (authoritative pricing,
  order-number generation `TBX-YYYYMMDD-XXXXXX` with DB uniqueness,
  transactional stock validation/decrement), `cartService`, `wishlistService`.
- **Middleware:** `validate` (zod parse → `res.locals.validated`; Express 5
  makes `req.query` a getter-only property, so parsed query is attached to
  `res.locals`), `clientId` (X-Client-Id for anonymous cart/wishlist/orders —
  **gotcha:** handler referenced `res` but only received `_res` → 500s),
  `logger` (method/path/status/duration), `errorHandler` (standardized
  `{ error: { code, message } }`, never leaks SQL/stack), rate limiter,
  helmet, CORS.
- `app.ts` (factory — tests build a fresh app per file), `server.ts`
  (bootstrap); dev auto-seed moved to `scripts/dev.ts` so `server.ts` stays
  clean for production.

## Task 4 — Backend tests ✅

- `server/tests/`: `global-setup.ts` (one embedded PG cluster per run,
  migrate + seed, deleted after), `helpers.ts` (seeded fixtures + `http()`
  supertest helper), suites for products (list/filters/sort/pagination,
  by-id, by-slug, invalid), categories, brands, **orders** (price
  calculation, invalid product/quantity/stock, insufficient stock, atomic
  stock decrement, order-number uniqueness, persistence, retrieval, payment
  snapshot card → `last4` only), cart (add/update/remove/clear/persistence/
  scoping), wishlist, health.
- **74/74 pass** against real PostgreSQL. Backend `build` (tsc) + `lint`
  (tsc --noEmit) clean.

## Task 5 — Frontend migration ✅

- **`src/lib/api/client.ts` + `errors.ts`** — fetch wrapper with timeout,
  JSON + `{ data, error }` envelope handling, `ApiError` with status/code;
  `src/lib/anonId.ts` — persistent `toybox-anon-id` sent as `X-Client-Id`.
- **`productService`** — API-backed catalog cache: `loadCatalog()` fetches
  products/categories/brands once; all existing accessors keep their
  synchronous signatures (UI untouched). `CatalogBoundary` gates the app on
  load with loading/error/retry (`PageLoader` gained a `label` prop).
- **`orderService`** — `placeOrder` (POST /api/orders), `getOrders`,
  `getOrderById`; orders no longer read/write localStorage. `useCheckoutFlow`
  places orders server-side, maps API errors to user-facing checkout errors.
- **`OrdersPage` / `OrderDetailsPage`** — async with loading/error/retry
  (`ErrorState onRetry`); 404 from the API renders the "Order not found"
  state.
- Cart/wishlist stay client-side (localStorage) — server APIs are ready;
  Phase 7 migrates them to authenticated ownership.

## Task 6 — Frontend tests ✅

- `src/test/setup.ts` seeds the catalog cache globally (accessor tests hold).
- Rewrote `productService.test.ts` (API cache, retry, dedupe), rewrote
  `orderService.test.ts` (API placement, error mapping, no localStorage),
  updated `useCheckoutFlow.test.tsx` (mocked API boundary, placeError),
  `routing.test.tsx` (server-backed order routes), added `lib/api/client.test.ts`,
  `lib/anonId.test.ts`, `OrdersPage.test.tsx`, `OrderDetailsPage.test.tsx`,
  `CatalogBoundary.test.tsx`.
- **Gotchas:** vitest root config must exclude `server/**` (jsdom can't run
  server suites); `useParams` needs a matched `<Route>` (plain render helpers
  don't provide one); fake timers hang `findBy*` queries (use sync queries);
  the queue-based retry mock misaligns when the first attempt's categories/
  brands calls consume queued values.
- **308/308 frontend tests pass**; lint clean; build clean; coverage
  thresholds pass.

## Task 7 — Full-stack E2E ✅

- `playwright.config.ts` now starts the **backend webServer** (fresh
  `toybox_e2e` DB: drop → migrate → seed → API on :4000) plus the production
  frontend build on :4173.
- OrderDetailsPage 404 → not-found fix (server 404 showed generic error
  state).
- **Self-healing Postgres:** Playwright force-kills the API, leaking the
  embedded PG server which blocks the next run (shared-memory). A pre-flight
  `stop-leftover-pg.mjs` kills leftover postgres binaries by command line
  match — **49/49 E2E pass on two consecutive runs**.

## Task 8 — Documentation + CI ✅

- New: `docs/backend-architecture.md`, `docs/database-schema.md`,
  `docs/api.md`, `docs/local-development.md`; updated README (Phase 6
  section, architecture tree, persistence model), `docs/roadmap.md`,
  `docs/testing.md` (backend + full-stack sections), `docs/implementation-memory.md`.
- CI: new `backend` job (typecheck → tests → build); E2E job now exercises
  the real stack.

## Task 9 — Final verification

- Frontend: `npm test` (308) · `npm run test:coverage` (thresholds pass) ·
  `npm run lint` (clean) · `npm run build` (clean).
- Backend: `npm run server:test` (74) · `npm run server:build` (clean).
- `npm run test:e2e` → 49/49 against PostgreSQL → Express → API → React.

## Remaining issues / notes for Phase 7

- Anonymous `X-Client-Id` scoping is **not** authentication — order
  retrieval by id + client id is a demo convenience until accounts exist.
- Cart/wishlist server APIs exist but the frontend still uses localStorage;
  Phase 7 migrates with authenticated ownership.
- `shipped → delivered` status pipeline exists server-side; no UI or
  automation yet.
- Order status is created as `confirmed`; no payment webhooks (Phase 8).

---

# Phase 9 — Admin Dashboard & Business Operations ✅

Running log for Phase 9 (admin API completion + admin UI v1). Phases 7
(auth) and 8 (payments) were implemented between Phase 6 and this phase;
their details live in `docs/auth-architecture.md`, `docs/auth-security.md`,
`docs/account-model.md` and the payments docs/roadmap entries.

## Starting state

The previous session left `server/src/routes/index.ts` with ~2000 lines of
admin endpoints that **did not compile**: missing imports, an unregistered
`requireAdmin`, unwired repositories, and several data bugs. This session
fixed the backend, then built the admin frontend.

## Task 1 — Make the admin backend compile ✅

- **routes/index.ts**:
  - `'../middleware/auth.ts'` import → `.js` (NodeNext resolution).
  - Added missing imports: `requireAdmin`, `createInventoryTransactionService`,
    `createAuditLogService`, repo types (`UserRepository`, `ProductRepository`,
    `CategoryRepository`, `BrandRepository`, `InventoryTransactionRepository`,
    `AuditLogRepository`).
  - Built a shared `authDeps = { sessionRepo, userRepo, config }` object —
    `optionalAuth` was called without `userRepo`.
  - **Gotcha:** `requireAdmin` is a *factory* (`(deps) => middleware`). The old
    code did `router.use(requireAdmin)` which registered the factory itself as
    a pass-through middleware — i.e. **no admin check existed at all**. Fixed
    to `router.use(requireAdmin(authDeps))`.
  - **Gotcha:** registering `requireAuth`/`requireAdmin` with bare
    `router.use(...)` intercepts *unknown* routes too → unknown-path test got
    401 instead of 404. Scoped both to `/admin`: `router.use('/admin', …)`.
  - Replaced every unsafe `parseInt(req.params.x)` with zod param validation
    (`validate(schema, 'params')` + `res.locals.validated.params`) via new
    `schemas/admin.ts` (`numericIdParamsSchema`, `orderNumberParamsSchema`,
    `categoryIdParamsSchema`, `orderStatusUpdateSchema`,
    `customerStatusUpdateSchema`, `adminPaginationSchema`).

## Task 2 — Fix admin data bugs found by reading SQL against migrations ✅

- Dashboard queried `WHERE active = true` on products — column is
  `is_active`. Fixed.
- Customers endpoints treated `users.status` as boolean (`status = true`,
  `isActive: row.status`) — the column is **text** (`'active' | 'suspended'`
  per migration 004). Now filters on text and maps `isActive:
  row.status === 'active'`; body schema accepts `{ status: 'active' |
  'suspended' }`.
- Payments list/detail JOINed `ON o.order_id = p.order_id` — orders has no
  `order_id`; correct join is `o.id = p.order_id`.
- Inventory adjust route read `req.params.id` while the path param is
  `:productId` — adjustments always looked up product `undefined`→NaN. Fixed.

## Task 3 — Wire app.ts + fix service-layer type errors ✅

- `app.ts` now creates `inventoryTransactionRepo` + `auditLogRepo` and passes
  them (plus `userRepo`, `productRepo`, `categoryRepo`, `brandRepo`) into
  `createApiRouter`. `paymentProviderInstance` null → `undefined` (ApiDeps).
- `auditLogRepository`: `import('pg').JSON` doesn't exist → `Record<string,
  unknown> | null` (pg parses jsonb already). Repo's `listLogs`/`getLogById`
  take no pool arg — fixed the service calls.
- `orderService`: imported `OrderStatus`, `.js` extension on orderStatus
  import, `scope ?? null` for `getOrderByNumber`, generic `Error` →
  `NotFoundError`/`ConflictError`.
- `paymentService`: provider field typed `PaymentProvider | undefined`;
  webhook handlers now pass the transaction `client` as the first arg of
  `orderRepo.updateOrderStatus(q, orderNumber, status)`.

## Task 4 — Migration 009: order status model ✅

- The DB CHECK only allowed `('confirmed','shipped','delivered','cancelled')`
  but the payment webhook writes `'paid'` and the admin API accepts
  `'pending'` → any paid webhook would have violated the constraint.
- `009_extend_order_status.sql` drops the old (auto-named) CHECK via a
  `pg_constraint` lookup DO block and re-adds it with all six states; adds
  `idx_orders_status`.
- Server `OrderStatus` type extended with `'pending'`; `utils/orderStatus.ts`
  transition table now type-checks and is the single source used by both the
  webhook path and the admin endpoint.
- Verified applied: `schema_migrations` shows version 9 and a
  `UPDATE … SET status='paid' WHERE false` passes the constraint.

## Task 5 — Backend tests for the admin surface ✅

- New `server/tests/admin.test.ts` (10 tests): guard matrix (401 anonymous /
  403 customer / 200 admin), guards don't swallow unknown routes, dashboard
  KPI shape, product create→update→soft-delete round-trip, inventory payload
  validation + negative-stock rejection (`409 insufficient_stock`) + valid
  adjustment writing an `inventory_transactions` row, order transition state
  machine (invalid skip rejected, confirmed→paid→shipped→delivered accepted,
  delivered final) with audit-log row count assertions, customer status text
  validation.
- **Gotcha:** `products.id` is a plain `integer PRIMARY KEY` (mirrors seeded
  frontend ids), NOT identity — admin product INSERT must allocate
  `(SELECT COALESCE(MAX(id), 0) + 1 FROM products)` explicitly or it fails
  with a null-id violation.

## Task 6 — Admin frontend ✅

- **New `src/types/admin.ts`** — admin DTOs incl. `AdminPage<T>` envelope.
- **New `src/services/adminService.ts`** — typed admin API over the shared
  client (`fetchDashboardStats`, products CRUD, inventory adjust, orders +
  status, customers + status, payments, audit logs); `AdminProductPatch`
  mirrors the server update schema.
- **New `src/components/RequireAdmin.tsx`** — loading → login redirect (with
  `returnTo`) → quiet "Admin access required" state unless
  `user.role === 'admin'`. UX only; the server enforces the real rule.
- **New pages under `src/pages/admin/`**: `AdminLayoutPage` (tab nav +
  Outlet), `AdminDashboardPage` (KPI cards), `AdminProductsPage`
  (search/status filter/pagination, activate-deactivate toggle, soft delete),
  `AdminInventoryPage` (stock-level filters, inline adjust form with ±
  stepper + required reason), `AdminOrdersPage` (status/payment/customer
  filters, "Move to…" dropdown that only offers legal transitions),
  `AdminCustomersPage` (suspend/reactivate), `AdminPaymentsPage` +
  `AdminAuditLogsPage` (read-only tables).
- **Routes:** nested `/admin/*` under `<RequireAdmin><AdminLayoutPage/>`.
- **Navbar:** dashboard icon link (desktop) + Admin entry (mobile menu),
  rendered only when `user.role === 'admin'`; frontend `User` type gained
  optional `role` (server already returns it).
- **Lint gotcha:** `react-hooks/set-state-in-effect` rejects synchronous
  `setError(null)` at the top of fetch effects — clear errors inside the
  promise handler instead (`then: setResult+setError(null)`).

## Task 7 — Documentation ✅

- `docs/api.md` — new "Admin" section (guards, envelope, every endpoint +
  filters + error codes), order-lifecycle paragraph updated.
- `docs/roadmap.md` — Phase 9 marked complete with summary.
- `PROGRESS_SUMMARY.md` (repo root) rewritten to reflect completed state +
  next-step candidates.

## Task 8 — Verification ✅

- Server: build ✓ · lint (tsc --noEmit) ✓ · tests **141/141** (131 prior +
  10 new admin).
- Frontend: lint ✓ · production build ✓ · tests 370 passed / 3 failed —
  the same 3 pre-existing checkout-flow failures documented before this
  phase (`useCheckoutFlow` ×2, `routing` ×1; order-placement mocks, unrelated
  to admin work).
- Migration 009 verified applied against the dev embedded database.

## Remaining notes / next candidates

- Admin UI has no product create/edit forms yet (API + validation exist);
  category/brand management UI also pending.
- No per-product inventory transaction history view.
- No admin E2E specs yet; unit/integration coverage lives in
  `server/tests/admin.test.ts`.
- No admin user seeding path — promote via SQL
  (`UPDATE users SET role='admin' WHERE …`) until an invite flow exists.
- Bundle size warning still open (pre-existing, see Phase 5 notes).
