# Order Data Model

Orders are stored in `localStorage` under `toybox-orders` as an array (newest first). Types live in `src/types/order.ts`.

```ts
interface Order {
  id: string;                 // TBX-20260815-8F4K2M
  createdAt: string;          // ISO timestamp
  status: 'confirmed' | 'shipped' | 'delivered';
  customer: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
  };
  shippingAddress: {
    line1: string;
    line2: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
  payment: {
    method: 'card' | 'upi' | 'cod';
    last4?: string;   // card only — last four digits
    upiId?: string;   // upi only
  };
  items: Array<{
    id: number;
    name: string;
    image: string;
    brand: string;
    price: number;
    quantity: number;
  }>;
  pricing: {
    subtotal: number;
    discount: number;
    shipping: number;
    tax: number;
    grandTotal: number;
  };
}
```

## Payment Safety

**An order never contains sensitive payment information.** The `payment` object stores only:

- `method` — how the customer paid
- `last4` — the last 4 digits of the card (card payments)
- `upiId` — the customer's UPI id (UPI payments)

CVV, the full card number, and the expiry are **never** persisted — not on the order, not in the checkout draft, not anywhere in `localStorage`. Tests assert this invariant (`orderService.test.ts`, `checkoutService.test.ts`).

## Order Creation

`orderService.buildOrder({ items, shipping, payment })`:

1. Computes totals via `calcTotals` (single source of truth).
2. Generates a `TBX-YYYYMMDD-XXXXXX` id, regenerating on collision with existing orders.
3. Maps items to the `OrderItem` shape (a display snapshot — a later price change never mutates history).
4. Stores only safe payment display data.

## Reading & Sanitization

Every read goes through `orderService.getOrders()`, which:

- Returns `[]` on malformed JSON or non-array data.
- Runs each record through `sanitizeOrder`.
- Drops records that fail validation.

`sanitizeOrder` also migrates **legacy Phase 1 orders** (the old flat shape with `shippingInfo.fullName`, `paymentLast4`, `date`, `subtotal/shipping/tax/total`) into the current structure, splitting `fullName` into first/last name and mapping address fields. This means existing users keep their history after the upgrade.

## Delivery Estimate

`estimateDeliveryRange(createdAt)` returns `[+3 days, +5 days]` (constants `DELIVERY_DAYS_MIN` / `DELIVERY_DAYS_MAX` in `constants/checkout.ts`). `formatDeliveryRange` renders it like `18 Aug – 20 Aug, 2026`.
