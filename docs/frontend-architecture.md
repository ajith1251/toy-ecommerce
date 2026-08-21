# Frontend Architecture

ToyBox is organized into clear layers so the UI never reaches into data
storage directly, and the future migration to a real backend only touches
one seam.

```
UI (pages / components)
        ↓
Hooks / State (useShop, useCart, useCheckoutFlow, …)
        ↓
Services (productService, cartService, wishlistService, recentService,
          orderService, checkoutService)
        ↓
Data Access Boundary (lib/storage → localStorage keys in constants/storage)
```

Later (Phase 5+), services swap their internals:

```
CURRENT                          FUTURE
productService                   productService
   ↓                                 ↓
static products (data/products)      apiClient (lib/api)
                                         ↓
                                     REST API / backend / database
```

## Layer rules

| Layer      | Owns                                              | Never does                                  |
| ---------- | ------------------------------------------------- | ------------------------------------------- |
| Components | Rendering, interaction, presentation, a11y        | Business math, persistence, data access      |
| Hooks      | React state + effects, wiring services to UI      | Direct `localStorage` access                 |
| Services   | Domain logic, persistence, validation of records  | Import components or use React hooks         |
| lib/       | Generic utilities (`cn`, `storage`, `validation`) | Import components or services                |
| constants/ | Business config + storage keys                    | —                                            |
| types/     | Shared domain models                              | Duplicated per-component type definitions    |

## Folder map

```
src/
├── app-ish:  App.tsx (router + providers + error boundary), routes.tsx
├── pages/          one component per route
├── components/
│   ├── ui/         primitives (Button, Input, Modal, Badge, EmptyState, …)
│   ├── layout/     Navbar, Footer, CartDrawer, Quick View modal, mobile drawers
│   ├── sections/   page sections (Hero, FilterBar, ProductListing, …)
│   ├── checkout/   checkout step forms + summary (shared by route)
│   └── orders/     OrderCard, OrderDetails
├── context/        ShopProvider + ShopContext (shared app state via useShop())
├── hooks/          state hooks, incl. useCheckoutFlow (checkout state machine)
├── services/       domain + data-access services (see docs/data-access.md)
├── data/           static catalog source (products.ts)
├── constants/      checkout config + storage keys
├── lib/            cn(), storage wrapper, validation, slug helpers
├── types/          shared domain types
├── utils/          pure engines (productFilters, orderCalculations, orderId)
└── test/           setup, fixtures, routing suite
```

See also: [data-access.md](data-access.md), [state-management.md](state-management.md),
[design-system.md](design-system.md), [testing.md](testing.md), and the
[ADRs](../docs/decisions/) for the rationale behind key choices.
