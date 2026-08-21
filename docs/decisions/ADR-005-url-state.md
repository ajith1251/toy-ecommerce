# ADR-005: URL state for search and important browsing filters

**Status:** Accepted (Phase 4)

## Context

Routing (ADR-001) made URLs possible. Search results, filtered category/brand
views and sorted listings are shareable, refresh-safe browsing state — exactly
what URLs are for. But not every filter deserves the URL; rating/price/stock
are per-session preferences, not things users link to.

## Decision

URL state is used **only where it provides real user value**:

| Route              | URL state                                                  |
| ------------------ | ---------------------------------------------------------- |
| `/search?q=robot`  | `q` (search query) — already existed, kept as canonical     |
| `/products`        | `?category=…`, `?brand=…`, `?sort=…`, `?q=…` (new in Phase 4) |
| `/category/:slug`  | Route param fixes the category (no filter params)          |
| `/brand/:slug`     | Route param fixes the brand (no filter params)             |

Mechanics:

- The URL is the source of truth when parameters are present: `/products`
  syncs `category`/`brand`/`sort`/`q` into the shared filter store on change.
- Filter changes push back to the URL with `replace` (no history spam).
- All other filter state (age group, rating, price range, stock) remains in
  the shared filter store — persisted session preference, not link state.

## Consequences

- Browsing state is shareable and survives refresh/back/forward.
- The URL never bloats with low-value parameters.
- `minPrice`/`maxPrice` were deliberately excluded: the price range is derived
  from the current dataset and reads poorly as URL params; revisit if a real
  API makes fixed price tiers meaningful.
