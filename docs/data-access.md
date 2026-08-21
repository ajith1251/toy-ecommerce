# Data Access & Service Layer

## Service conventions

Services live in `src/services/` and follow a consistent naming scheme:

```
get / load   read (getProducts, loadCart, getOrderById)
save / set   persist (saveCart, saveOrder)
create / build   construct a record (buildOrder)
remove / clear   delete (removeCartItem, clearOrders)
search / find    query (searchProducts, findBrandBySlug)
```

Services are **plain modules**:

- No React imports, no hooks, no components.
- Independently testable (most have a `.test.ts` beside them).
- Persistence goes through `lib/storage`, never `localStorage` directly.

## Catalog data-access boundary

`productService` is the only module that reads the static catalog. The UI,
hooks and other services call `getProducts()`, `getProductById(id)`,
`getProductsByCategory(...)`, `getProductsByBrand(...)`,
`getProductsByAgeGroup(...)`, `searchProducts(q)` plus category/brand
lookups. **No page imports `data/products.ts` directly.**

```
UI → productService → data/products (now)  →  apiClient (future)
```

Migration path when the backend lands: reimplement `productService` to call
an API client with the same function signatures; callers are unchanged.

## Persistence layer

All `localStorage` access funnels through `lib/storage.ts`:

```
get(key, fallback, typeGuard?)   JSON parse + validate + fallback
set(key, value)                  JSON stringify, never throws
getRaw / setRaw                  plain strings (e.g. theme)
remove(key)                      safe delete
```

Keys are centralized in `constants/storage.ts` — no magic strings in hooks or
components. Each domain owns its key through its service:

| Domain          | Key                        | Service(s)                     |
| --------------- | -------------------------- | ------------------------------ |
| Cart            | `toybox-cart`              | cartService + useCart          |
| Wishlist        | `toybox-wishlist`          | wishlistService + useWishlist  |
| Recently viewed | `toybox-recent`            | recentService                  |
| Theme           | `toybox-theme`             | useTheme (via storage)         |
| Filters         | `toybox-filters`           | useFilters (via storage)       |
| Orders          | `toybox-orders`            | orderService                   |
| Checkout draft  | `toybox-checkout-draft`    | checkoutService                |

## Sanitization

Persisted records are validated on read:

- `orderService.sanitizeOrder` normalizes current + legacy Phase 1 shapes and
  drops malformed records.
- `checkoutService.isValidDraft` rejects drafts with the wrong version, step,
  shipping/payment shape or fingerprint.
- `cartService.isCartItem` filters corrupted entries (a bad item never nukes
  the whole cart); wishlist/recent keep only numeric ids.

## Future API boundary

No HTTP client is wired yet. When a backend exists:

1. Add `lib/api/client.ts` + `lib/api/errors.ts` (conventions only).
2. Reimplement `productService` (and optionally `orderService` reads) against
   the API while keeping signatures.
3. Keep `localStorage` for client-only state (cart before login, theme, etc.).
