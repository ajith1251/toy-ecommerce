# ADR-001: React Router for client-side routing

**Status:** Accepted (Phase 3)

## Context

ToyBox grew from a single-page modal-based storefront into a multi-page
application (product, category, brand, search, cart, checkout, orders). Deep
links, refresh support and browser back/forward became real requirements, so we
needed a routing solution rather than hand-rolled state-based "pages".

## Decision

Use **react-router-dom v7** with a single shared route table
(`src/routes.tsx`). The browser app renders it via `useRoutes` and the test
suite via `createMemoryRouter`, so routes are never defined twice.

- URLs are the source of truth for pages and important browsing state.
- Route guards for checkout (empty cart, incomplete steps) are client-side
  only — this is a frontend demo.

## Consequences

- Deep links work; a static host needs an SPA fallback rewrite to `index.html`.
- All navigation goes through `<Link>` / `useNavigate`, never `window.location`.
- New pages are added in one place (`routes.tsx`) and are automatically
  covered by the routing test suite.
