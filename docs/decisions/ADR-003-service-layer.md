# ADR-003: Service layer for domain logic and data access

**Status:** Accepted (Phase 4)

## Context

Business logic and data access were scattered: pages filtered product arrays
inline, hooks mixed state with persistence, and several components re-derived
the same data. Before a backend arrives, the app needs a stable seam between
UI and data.

## Decision

Introduce a thin **service layer** under `src/services/` owning domain logic
and data access:

| Service            | Owns                                                        |
| ------------------ | ----------------------------------------------------------- |
| `productService`   | Products, categories, brands, age groups (data-access boundary) |
| `cartService`      | Cart item operations + persistence                          |
| `wishlistService`  | Wishlist operations + persistence                           |
| `recentService`    | Recently-viewed cap/dedupe + persistence                    |
| `orderService`     | Order creation, sanitization, persistence, delivery math    |
| `checkoutService`  | Checkout draft persistence, cart fingerprints, payment snapshots |

Rules:

- Services are plain modules — no React, no components, no hooks.
- Services never import UI; UI imports services.
- Hooks hold React state and delegate operations to services.
- Components render; they don't compute business results inline.

## Consequences

- Each service is independently testable (no renderer required).
- The future API migration swaps service internals (static data →
  `apiClient`) without touching hooks or components.
- "Where does X live?" has one answer per concern.
