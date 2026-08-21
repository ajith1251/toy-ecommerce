# Routing Architecture (Phase 3)

ToyBox is now a route-driven application powered by **react-router-dom v7**. The
modal-driven navigation from Phase 1/2 (product detail modal, checkout modal,
order history modal) has been migrated to real routes while the underlying
components, services and `localStorage` model were preserved.

## Route map

| Route                 | Page               | Responsibilities |
| --------------------- | ------------------ | ---------------- |
| `/`                   | `HomePage`         | Landing page: Hero, age tabs, categories, featured, all products, recently viewed, newsletter |
| `/products`           | `ProductsPage`     | Full browsing experience: search, category/brand/rating/price/stock filters, sorting, grid, pagination |
| `/product/:id`        | `ProductDetailPage`| Canonical product detail (image, price, stock, quantity, cart, wishlist, info, related). Invalid ids → "Product not found" |
| `/category/:slug`     | `CategoryPage`     | Category title + matching products with the shared filters. Unknown slugs → "Category not found" |
| `/brand/:slug`        | `BrandPage`        | Brand title, product count + matching products. Unknown brands → "Brand not found" |
| `/search?q=…`         | `SearchPage`       | URL-addressable search results; refreshes preserve the query |
| `/wishlist`           | `WishlistPage`     | Wishlist grid, remove, add-to-cart, product navigation |
| `/cart`               | `CartPage`         | Canonical cart page (quantities, totals via `calcTotals`, move-to-wishlist, checkout CTA) |
| `/checkout/:step`     | `CheckoutPage`     | Checkout steps `shipping` → `payment` → `review` with route guards |
| `/orders`             | `OrdersPage`       | Order history (reads `orderService`) |
| `/orders/:id`         | `OrderDetailsPage` | Order details + post-purchase confirmation banner; invalid ids → "Order not found" |
| `*`                   | `NotFoundPage`     | Polished 404 page |

## Route table

The route table lives in a single file, `src/routes.tsx` (`appRoutes`), and is
shared by the browser app (`App.tsx` → `BrowserRouter` + `useRoutes`) and the
test suite (`createMemoryRouter`). No route definition is duplicated.

## Architecture

```
App (BrowserRouter)
└── ShopProvider                  → shared state context (cart, wishlist, theme, toasts, filters, recent, quick view)
    └── AppRoutes (useRoutes)
        └── Layout                → Navbar, <Outlet/>, Footer, CartDrawer, QuickView modal, Toasts
            └── <page/>
```

- `ShopContext` / `ShopProvider` replace the monolithic state previously held
  in `App.tsx`. Pages read `useShop()` instead of receiving dozens of props.
- `useFilters` now delegates to `utils/productFilters.ts` — the **single source
  of truth** for filtering/sorting. `ProductListing` and every listing page
  (`/products`, `/category/:slug`, `/brand/:slug`, `/search`) all call
  `filterAndSortProducts`, so filter logic is never duplicated.
- `useCheckoutFlow` is the single source of truth for the checkout state
  machine, consumed by the route-driven `CheckoutPage` (the old modal variant
  was removed in Phase 4; its tests were ported to the hook).
- Orders are always read/written through `orderService`; pricing always through
  `calcTotals`. Nothing else touches those keys.

## Dynamic parameters

- `/product/:id` — `useParams().id`, parsed with `Number()`. Non-numeric or
  unknown ids render a product-not-found state (never a crash).
- `/category/:slug` — matched against `CATEGORIES` ids.
- `/brand/:slug` — slugified brand names (`Hot Wheels` → `hot-wheels`); matched
  via `findBrandBySlug`.
- `/orders/:id` — resolved via `orderService.getOrderById(id)`.
- `/checkout/:step` — must be `shipping` | `payment` | `review`; anything else
  redirects to `/checkout/shipping`.

## Search parameters

- `/search?q=…` is the canonical search URL. The `q` param syncs into the
  shared `searchQuery` filter; typing in the search bar pushes updates back to
  the URL (`replace`), so back/forward and refresh behave.
- Missing or empty `q` renders an empty-search state with a CTA.

## Checkout route flow

```
/cart → /checkout/shipping → /checkout/payment → /checkout/review → /orders/:id (confirmation)
```

Guards (client-side, frontend demo only):

- Empty cart → redirect to `/cart`.
- `/checkout/payment` without valid shipping → redirect to `/checkout/shipping`.
- `/checkout/review` without valid shipping/payment → redirect to the earliest
  incomplete step.
- Invalid step segment → redirect to `/checkout/shipping`.

Step progression is the same Phase 2 flow: inline validation, safe draft
persistence (never CVV/full card numbers), cart-change protection, and a
duplicate-submission guard. After placing an order the app navigates to
`/orders/:id` with `justPlaced` state, which shows the confirmation banner above
the persisted order details — a single source of order details.

## Order routes

- `/orders` renders the history list via `OrderCard` components, reading
  `orderService.getOrders()`.
- `/orders/:id` renders `OrderDetails` with back/reorder.

## Search parameters

- `/products` also accepts URL params: `?category=`, `?brand=`, `?sort=`, `?q=`
  (ADR-005). They sync into the shared filter state when present and are pushed
  back to the URL on change, so filtered/sorted listings are shareable and
  refresh-safe.

## 404 handling

`*` renders `NotFoundPage` ("Oops! This toy wandered away.") inside the layout
(navbar + footer intact) with Framer Motion entrance. Invalid product, category,
brand, order and empty-search states are handled per-page so no route can crash
the application.

## Navigation architecture

- The Navbar uses `Link`/`NavLink` with clear active state for Home, Toys,
  Wishlist (count badge) and Orders, plus the age tabs and category mega-menu
  (which link to `/category/:slug`).
- `Breadcrumbs` are route-aware: every crumb is a real `Link` where a page
  exists (Home → Toys → Category → Product).
- Product cards link to `/product/:id` (image + title). The eye button is now
  **Quick View** (modal); the route is the canonical product experience, and the
  modal links through to "View Full Details".

## State preservation

All `localStorage` behavior is unchanged: cart, wishlist, recently viewed,
theme, orders and the checkout draft use their existing keys and services.
Refreshing any route (product, category, search, order detail, checkout step)
restores the same state via `localStorage` + URL.

## Deep-link safety summary

| Input | Behavior |
| ----- | -------- |
| `/product/999999` | "Product not found" |
| `/product/abc` | "Product not found" |
| `/category/unknown` | "Category not found" |
| `/brand/lego` | "Brand not found" |
| `/orders/UNKNOWN` | "Order not found" |
| `/search` (no `q`) | Empty search state |
| `/checkout/review` (no data) | Redirect to `/checkout/shipping` |
| `/anything-else` | 404 page |

## Hosting note

`BrowserRouter` needs server-side SPA fallback (any path serves `index.html`).
Vite's dev server and `vite preview` handle this automatically; a static host
(e.g. Netlify/Vercel) needs a rewrite rule so deep links like `/product/12`
resolve on refresh.
