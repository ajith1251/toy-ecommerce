# Roadmap

## Phase 3 — Routing & Store Pages ✅ Complete

- React Router v7 installed; the app is now route-driven (see
  [docs/routing.md](routing.md)).
- Routes: `/`, `/products`, `/product/:id`, `/category/:slug`, `/brand/:slug`,
  `/search?q=…`, `/wishlist`, `/cart`, `/checkout/:step`, `/orders`,
  `/orders/:id`, and a polished 404.
- Product detail migrated from modal → route (modal retained as **Quick View**).
- Checkout migrated from modal → `/checkout/:step` with step guards; order
  confirmation lives at `/orders/:id`.
- Route-aware breadcrumbs and Navbar links (Home / Toys / Wishlist / Orders).
- Single source of truth for filtering (`utils/productFilters.ts`) and for the
  checkout state machine (`useCheckoutFlow`).
- 29 new routing tests (96 total), lint and build clean.

## Phase 4 — Frontend Architecture Refinement ✅ Complete

- Layered architecture: UI → hooks → services → data-access boundary
  (see [frontend-architecture.md](frontend-architecture.md)).
- **Service layer** introduced: `productService`, `cartService`,
  `wishlistService`, `recentService` (plus existing `orderService` /
  `checkoutService`) — plain, React-free, independently tested modules.
- **Data-access boundary**: the UI never imports `data/products.ts` or touches
  `localStorage` directly anymore.
- **Storage abstraction** (`lib/storage`) + centralized keys
  (`constants/storage.ts`) with safe parsing and graceful failure.
- **URL state** on `/products` (`?category=`, `?brand=`, `?sort=`, `?q=`) —
  shareable browsing state (ADR-005).
- **UX standardization**: `EmptyState`, `ErrorState`, `ErrorBoundary`,
  `PageLoader`, `Badge`; empty/not-found states unified across the app;
  Button loading state; modal/dialog a11y; pagination a11y; image lazy
  loading.
- **Type consolidation**: one pricing type (`OrderPricing`), no duplicate
  `OrderTotals` interface.
- **Dead code removed**: modal `CheckoutContainer` / `OrderHistory`; their
  checkout tests ported to `hooks/useCheckoutFlow.test.tsx`.
- Docs updated: `frontend-architecture.md`, `data-access.md`,
  `state-management.md`, `design-system.md`, `testing.md` + 5 ADRs.
- 53 new tests (149 total), lint and build clean.

## Phase 5 — Testing & Quality Engineering ✅ Complete

- **271 unit/component/integration tests** (Vitest + RTL + jest-axe) across 28
  files, with v8 coverage reporting and enforced thresholds
  (statements/functions/lines 75%, branches 60% — actual: 84.6% / 77.3% /
  85.6% / 74.2%).
- **49 Playwright E2E tests** against the production build (specs in `e2e/`):
  the critical purchase journey (`journey.spec.ts`), storefront, product,
  cart, checkout (full flow, invalid-form blocks, empty-cart redirect,
  cart-changed guard, duplicate-submit), orders, persistence across reloads,
  routing (deep links, URL state, back/forward), and axe accessibility scans.
- **New coverage:** `recentService`, full `validation` matrix, pricing
  boundaries, filter edge cases, `useTheme` / `useToast`, `ShopProvider`
  integration, `/products` URL-state integration, and behavioral + a11y tests
  for every shared UI primitive.
- **Bugs found & fixed by the new tests:** whitespace search now trims;
  `useTheme` stops persisting before the user toggles (fixing the OS
  dark-mode listener); a11y — `SortSelect`, `SearchBar` clear button,
  `ActiveFilters` chips, `CartDrawer` buttons gained accessible names.
- **Infrastructure:** `test:coverage`, `test:e2e`, `verify` scripts;
  `playwright.config.ts` (builds + serves the bundle); CI-ready GitHub
  Actions workflow (lint → unit → coverage → build → E2E); docs
  `testing.md` rewritten + new `testing-strategy.md`.

## Phase 6 — Backend, Database & Real Persistence ✅ Complete

- **Express + TypeScript backend** (`server/` npm workspace) layered
  routes → controllers → services → repositories → PostgreSQL; app factory
  + server bootstrap, structured request logging, centralized error
  handling, CORS, rate limiting on order/cart/wishlist routes.
- **Real PostgreSQL 18** via embedded-postgres for dev/test (no Docker
  needed; `DATABASE_URL` supported for external DBs) with a deterministic
  migration system (`server/migrations/`) and an idempotent seed that
  transforms the existing 54 products / 52 categories / 53 brands from
  `src/data/products.ts` into the database.
- **Server-authoritative orders:** `POST /api/orders` validates products,
  quantity and stock, recalculates subtotal/discount/shipping/tax/grandTotal
  from current database prices, generates collision-safe order numbers
  (`TBX-YYYYMMDD-XXXXXX`, DB-unique), and persists order + items + stock
  decrement in one transaction (row locks for concurrency).
- **Safe payment snapshots only** (`CARD`/`UPI`/`COD`; card → `last4`) —
  CVV / full numbers / expiry never stored.
- **REST APIs:** products (filter/sort/paginate), categories, brands,
  orders (create/list/get), anonymous cart + wishlist (X-Client-Id scoped;
  documented as not-security until Phase 7), health, docs in `docs/api.md`.
- **Frontend migrated:** `productService` (API-backed catalog cache with
  `CatalogBoundary` loading/error/retry), `orderService` (server-placed and
  read orders; localStorage no longer stores orders), `lib/api/client.ts` +
  `lib/api/errors.ts`, anonymous id (`lib/anonId`).
- **Testing:** 74 backend tests (Vitest + supertest against an isolated
  test DB), 308 frontend tests, 49 full-stack Playwright E2E tests running
  browser → React → API → Express → PostgreSQL.
- Docs: `backend-architecture.md`, `database-schema.md`, `api.md`,
  `local-development.md`; README/roadmap/testing updated.

## Phase 7 — Authentication & Customer Accounts ✅ Complete

- **Real accounts:** `users` table (unique normalized email, Argon2id
  password hashes), `sessions` (revocable, hash-stored tokens, rotation),
  `addresses`, `password_resets` — migration `004_create_auth.sql`.
- **Secure sessions:** opaque token in an **HttpOnly + SameSite=Lax** cookie
  (Secure in production) — nothing in localStorage; `refresh` rotates
  (session-fixation protection); logout / "logout all" / password change
  revoke sessions server-side.
- **Server-derived ownership:** `optionalAuth`/`requireAuth` middleware;
  carts/wishlists keyed by `owner_key` (`user:<id>` vs `client:<id>`);
  `orders.user_id`; cross-user resources are 404-safe; `GET /api/orders`
  returns only the session user's orders.
- **Guest → account migration:** `POST /api/auth/merge` unions guest server
  cart + localStorage items into the account cart (capped at stock),
  unions wishlist (duplicates collapse), claims same-browser anonymous
  orders; guest copies retired so reloads can't double-merge.
- **Account area:** `/login`, `/register`, `/account` (profile edit),
  `/account/orders`, `/account/addresses` (CRUD + default),
  `/account/security` (password change, logout everywhere); `RequireAuth`
  redirects to `/login` with `returnTo`.
- **Checkout integration:** saved-address picker for authenticated users;
  orders snapshot the address at purchase time.
- **Security controls:** auth-endpoint rate limiting, generic login/
  forgot-password responses (no enumeration), same-origin CSRF check +
  SameSite=Lax, safe error envelopes, no secrets in logs/responses.
- **Testing:** 48 new backend tests (122 total — auth, ownership isolation,
  merge, addresses, passwords, rate limiting), 57 new frontend tests
  (366 total), 17 new E2E specs (66 total — auth journeys, cart/wishlist
  migration, user-to-user isolation, session persistence).
- Docs: `auth-architecture.md`, `auth-security.md`, `account-model.md`;
  README / `api.md` / `database-schema.md` / `architecture.md` updated.

## Phase 8 — Real Payments ✅ Complete (test mode)

- Razorpay Standard Checkout integrated for card/UPI against **test-mode**
  credentials; COD kept as a first-class path.
- Server-side payment-order creation with amount/currency verification,
  checkout-response signature verification, and an HMAC-verified webhook
  (`POST /api/webhooks/razorpay`) with idempotent state handling.
- Payments persisted as a first-class ledger (`payments` table,
  migration `005_create_payments_and_add_payment_status.sql`) and surfaced
  in order details and the admin panel.
- Live keys are intentionally not configured — no real charges occur until
  production deployment (Phase 10).

## Phase 9 — Admin Dashboard & Business Operations ✅ Complete (backend + UI v1)

- **Admin API** (`/api/admin/*`, session + `admin` role enforced
  server-side): dashboard KPIs from real SQL aggregation, product CRUD
  (soft delete), category & brand management with referential-integrity
  guards, inventory listing + row-locked stock adjustments that refuse
  negative stock and write `inventory_transactions` rows atomically,
  order list/detail/status transitions (validated state machine),
  customer list/detail/suspend, payments list/detail, audit-log listing.
- **Audit trail:** every admin mutation writes an `admin_audit_logs` entry
  (actor, action, entity, changes JSON, IP, user agent) — migrations
  `007_create_inventory_transactions.sql`, `008_create_admin_audit_logs.sql`.
- **Order status model extended:** migration `009_extend_order_status.sql`
  adds `pending`/`paid` to the `orders.status` CHECK; shared transition
  helper (`utils/orderStatus.ts`) used by both the webhook path and admin.
- **Admin UI** (`/admin`, guarded by `RequireAdmin`): tabbed layout with
  Dashboard KPI cards, Products (search/filter/pagination, activate /
  deactivate / delete), Inventory (stock adjust with reason), Orders
  (filters + status transitions), Customers (suspend/reactivate),
  Payments and Audit Logs (read-only). Navbar shows an admin entry point
  for admins only.
- Frontend talks to the admin API through a dedicated `adminService`
  (`src/services/adminService.ts`) on top of the shared API client.

## Phase 10 — Production Engineering, Deployment & Reliability ◐ Implemented (staging-ready — not deployed)

- **Fail-safe production config:** `validateProductionConfig` refuses
  startup in production without `DATABASE_URL`, explicit non-localhost
  `CORS_ORIGINS`, secure cookies, Razorpay credentials + webhook secret,
  and SMTP email (`.env.production.example` documents every variable).
- **Observability:** structured JSON logging (`LOG_FORMAT=json`), per-request
  correlation ids (`X-Request-Id` echoed, embedded in error envelopes),
  provider-agnostic error-tracking boundaries on server and client
  (`observability/errorTracking.ts` / `lib/errorTracking.ts`).
- **Health split:** `/api/health/live` (process) vs `/api/health/ready`
  (process + PostgreSQL); legacy `/api/health` kept.
- **Resilience:** graceful shutdown hardened (double-signal guard, 20 s
  force-exit cap, keep-alive tuning behind proxies), Razorpay client
  timeout (`RAZORPAY_TIMEOUT_MS`), pool sizing via env
  (`DB_POOL_MAX`/idle/connect), general + admin rate limiters added
  alongside the existing auth limiter — all env-configurable.
- **Data safety:** `db:reset` blocked in production; backup/restore tooling
  (`server/scripts/snapshot.ts`) and an executed restore drill: fresh DB →
  migrations → replay → count verification → API booted on restored data
  serving the catalog.
- **Containers:** multi-stage `Dockerfile.web` (nginx SPA + `/api` proxy +
  immutable asset caching) and `Dockerfile.server` (non-root, prod deps
  only, no embedded PG), `.dockerignore`, production-like compose stack
  (web/api/postgres, DB not exposed). Images build-verified in CI — Docker
  is not installed on the dev machine, so no local build/run.
- **CI:** new `docker` job (builds both images, pushes nothing) and
  report-only `audit` job (`npm audit`) on top of lint/unit/coverage/build/
  backend/E2E jobs.
- **Frontend:** global error tracking wired into `ErrorBoundary` +
  window handlers; vendor chunk split removes the >500 kB bundle warning
  (largest chunk now ~245 kB) without async routes.
- **Quality:** fixed the 3 long-standing checkout-flow test failures at
  their root cause (Phase 8's Razorpay SDK script never loads in jsdom —
  tests now stub `window.Razorpay`): frontend suite 373/373, backend
  154/154.
- **Docs:** `deployment.md`, `production-operations.md`,
  `disaster-recovery.md`, `production-readiness.md`; api.md health section
  rewritten.
- **Honest status:** production-engineered / staging-ready. Not yet
  deployed to a live environment (no hosted domain/TLS/staging, no live
  Razorpay keys).

## Later Ideas

- Product reviews & ratings by customers with verified purchases.
- Promotions engine (wire `DISCOUNT_RATE`/discounts into `calcTotals` — the
  plumbing is already there).
- Inventory/stock syncing from a backend.
- Admin dashboard for orders, products, and fulfillment.
- Email receipts (currently simulated copy only).
- Code-split routes with `React.lazy` (the production bundle currently exceeds
  Vite's 500 kB advisory chunk-size warning; deferred because it would require
  converting the routing suite to async assertions).
