# Testing Strategy

ToyBox is a frontend-only application whose correctness depends on business
rules (pricing, validation, checkout state machine) and persistence
(localStorage) more than on UI chrome. The testing strategy therefore favors
**fast, deterministic tests of real behavior and contracts** over coverage
theater.

## The pyramid

```text
                 E2E (Playwright)
                /     few, slow, critical journeys
          Integration
        (routing + context)
      Component (RTL + axe)
   Unit & Service (pure logic)
      many, fast, no browser
```

- **Unit & service tests** — the bulk of the suite. Pure logic (filtering,
  pricing, storage, validation, order ids) and the service layer are tested
  directly, with no renderer. They encode business rules as contracts.
- **Hook tests** — state hooks via `renderHook`; the checkout state machine via
  a minimal harness bound to the real forms (`useCheckoutFlow.test.tsx`).
- **Component tests** — behavioral tests for reusable primitives (Button,
  Input, Modal, Toast, Breadcrumbs, ProductCard, EmptyState, ErrorState,
  PageLoader) plus `ErrorBoundary`. Assert user-visible behavior, not markup.
- **Accessibility** — `jest-axe` in component tests (structural/ARIA rules)
  and `@axe-core/playwright` page scans in E2E (critical violations only).
- **Routing / integration** — the real route table rendered through
  `createMemoryRouter(appRoutes)` under `ShopProvider`; URL-state integration
  for `/products`.
- **E2E** — Playwright (Chromium) against the production build served by
  `vite preview`. Reserved for critical user journeys, cross-page flows,
  persistence across reloads, and route behavior that needs a real browser.

## Mocking rules

- **Never mock internal business logic.** Tests exercise the real
  `calcTotals`, `orderService`, `productFilters`, etc. Mocking them would test
  the mocks.
- **Mock only genuine external/browser boundaries:**
  - `framer-motion` → a thin mock that renders `motion.*` as plain DOM
    elements (jsdom can't run spring animations; they add no behavior).
  - `window.matchMedia` → polyfilled in `src/test/setup.ts` (jsdom lacks it).
  - Time → `vi.useFakeTimers()` for the checkout flow and toast auto-dismiss;
    system clock via `vi.setSystemTime` where ids derive from `Date.now()`.
- E2E uses the **real** app (real framer-motion, real browser) — nothing is
  mocked there.

## Test isolation & determinism

- `src/test/setup.ts` runs `cleanup()` and clears `localStorage` after every
  test, so no test sees another test's persisted state.
- Playwright gives each test a fresh browser context (fresh `localStorage`).
- Order IDs are tested by **format and uniqueness**, never hardcoded output.
- No real network requests, no real timeouts, no arbitrary waits (E2E uses
  auto-waiting locators; unit tests use fake timers).

## Naming conventions

Test names describe the behavior, not the unit:

```text
bad:  test('cart')                        good: it('removes the item when quantity drops to zero')
bad:  test('order')                       good: it('persists a sanitized order without CVV or full card number')
```

Test files sit **next to the code they cover** (`src/services/cartService.test.ts`,
`src/components/ui/Modal.test.tsx`, …). Shared fixtures/helpers live in
`src/test/`.

## Quality gates

```bash
npm test              # unit + component + integration (Vitest, jsdom)
npm run test:coverage # same + v8 coverage report (thresholds enforced)
npm run lint          # ESLint (flat config)
npm run build         # tsc -b + vite build
npm run test:e2e      # Playwright (builds + serves the production bundle)
npm run verify        # lint + unit + build — the fast pre-commit gate
```

Coverage thresholds (enforced by `vite.config.ts`): statements 75%,
functions 75%, lines 75%, branches 60%. The aim is **strong meaningful
coverage of business-critical code** (services, hooks, utils, lib) — not 100%
for its own sake. UI chrome (e.g. trivial icon-only components) is covered by
behavior, not line-count chasing.

## Regression suite

The E2E specs double as the regression suite: `journey.spec.ts` (the complete
purchase journey) plus storefront, product, cart, checkout, orders,
persistence, routing, and accessibility specs. Run `npm run test:e2e` before
any future phase to confirm storefront behavior is intact.

## Known limitations

- Color-contrast rules are only assessed via manual review / the axe E2E scan
  reports; component `jest-axe` checks run in jsdom which cannot compute colors.
- E2E runs Chromium only (the stack's primary target).
- The `verify` script intentionally excludes E2E (browser startup cost) — CI
  runs it as a separate job.
