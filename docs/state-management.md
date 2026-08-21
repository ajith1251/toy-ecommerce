# State Management & Ownership

## Rules of thumb

- **URL state** for things users link to or bookmark (product, category,
  brand, search query, checkout step, sort on `/products`).
- **Shared (context) state** for cross-cutting session state used by many
  components: cart, wishlist, theme, toasts, filters, recently viewed,
  quick-view modal.
- **Component state** for ephemeral UI (open/closed drawers, quantity
  steppers, mobile menu, page number).
- **Persisted state** is always written through a service + `lib/storage`.

## Ownership table

| State            | Owner                      | Persisted? | URL?            |
| ---------------- | -------------------------- | ---------- | --------------- |
| Cart items       | `useCart` (via ShopContext) | Yes        | No              |
| Wishlist ids     | `useWishlist` (via ShopContext) | Yes    | No              |
| Recently viewed  | `ShopProvider` → recentService | Yes     | No              |
| Theme            | `useTheme` (via ShopContext) | Yes       | No              |
| Filters          | `useFilters` (via ShopContext) | Yes     | Partial (see below) |
| Checkout state   | `useCheckoutFlow` (page/modal local) | Draft only | Step: `/checkout/:step` |
| Orders           | `orderService` (read on mount) | Yes     | `/orders/:id`   |
| Toasts           | `useToast` (via ShopContext) | No       | No              |
| Quick view modal | `ShopProvider` local       | No        | No              |

## Filters: shared store + URL

The filter state lives in one shared store (`useFilters`, exposed via
`useShop().filters` / `setFilter`) so every listing page behaves identically.
URL state layers on top where it adds value (ADR-005):

- `/search` — `?q=` is canonical and drives the shared `searchQuery`.
- `/products` — `?category=`, `?brand=`, `?sort=`, `?q=` sync into the shared
  store when present; filter changes push back to the URL.
- `/category/:slug` and `/brand/:slug` — the route fixes category/brand;
  other filters still work through the shared store.

## Checkout state machine

`useCheckoutFlow` owns shipping/payment forms, errors, cart fingerprint,
totals and the place-order guard. It is shared by the checkout route
(`CheckoutPage`) — the only live consumer. The step lives in the URL
(`/checkout/shipping|payment|review`) with transient `processing`/`done`
states held in memory. A safe draft (never CVV/full card numbers) is restored
when the cart fingerprint still matches.
