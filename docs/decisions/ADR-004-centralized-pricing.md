# ADR-004: Centralized pricing via `calcTotals`

**Status:** Accepted (Phase 2, confirmed Phase 4)

## Context

Cart drawer, checkout steps, order review and persisted orders all display the
same pricing breakdown (subtotal, discount, shipping, tax, grand total).
Duplicate implementations would drift — e.g. one place forgetting the
free-shipping threshold.

## Decision

`calcTotals(items)` in `src/utils/orderCalculations.ts` is the **single source
of truth** for all pricing. It reads business constants from
`src/constants/checkout.ts` (currency, shipping fee, free-shipping threshold,
tax rate, discount rate) and returns the shared `OrderPricing` shape defined
in `src/types/order.ts`.

- Cart, checkout and order display call it — never re-implement the math.
- `formatMoney()` is the single formatter (currency symbol centralized).
- The `OrderTotals` alias exists only so consumers read a descriptive name;
  there is one pricing type, not two.

## Consequences

- A price-rule change (new tax rate, higher threshold) is a one-line edit.
- Order records and live UI can never disagree about totals.
- `orderCalculations.test.ts` pins the behavior.
