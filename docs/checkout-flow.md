# Checkout Flow

```
Cart → Checkout → Shipping → Payment → Review → Place Order → Confirmation → Order History
```

## Entry

The cart drawer's **Checkout Now 🚀** button and the `/cart` page both navigate
 to `/checkout/shipping`. An empty cart is blocked with an error toast, and the
 checkout route redirects to `/cart` as a second layer of protection. The
 checkout state machine lives in `useCheckoutFlow`, consumed by `CheckoutPage`
 (the Phase 2 modal variant was removed in Phase 4).

## Steps

### 1. Shipping

Fields: First Name, Last Name, Email, Phone, Address Line 1, Address Line 2 (optional), City, State/Province, Postal Code, Country.

- Inline validation via `validateShipping()` in `lib/validation.ts`.
- Email format, phone (7–15 digits), and postal code (US ZIP, ZIP+4, UK/CA/IN formats) are validated.
- Errors are announced (`role="alert"`) and associated with their inputs (`aria-invalid`, `aria-describedby`).
- Progression to Payment is blocked until the form is valid; entered values are preserved when navigating back.

### 2. Payment (simulated)

Three methods — **Credit/Debit Card**, **UPI**, **Cash on Delivery**:

- **Card**: cardholder name, Luhn-validated card number, future MM/YY expiry, 3–4 digit CVV. Marked as demo.
- **UPI**: validated `name@bank` UPI ID.
- **COD**: no credentials required.

Payment is fully simulated — no real charge occurs, and no payment provider is integrated. The full card number and CVV exist only in component state and are **never** written to `localStorage`.

### 3. Review

Shows customer, shipping address, payment (masked: `•••• 4242`), every line item (image, name, brand, quantity, unit price, line total), and the pricing breakdown (subtotal, discount, shipping, tax, grand total). Totals come from the shared `calcTotals` utility, so they always match the cart.

### 4. Place Order

- Verifies the cart is non-empty and still matches the checkout snapshot.
- Generates a unique `TBX-YYYYMMDD-XXXXXX` id (collision-checked against existing orders).
- Builds the order (only safe payment data), saves to `toybox-orders`, clears the cart, clears the draft, and shows the confirmation.
- A `processingRef` guard plus the processing UI prevent duplicate submissions; the button is disabled while processing.

### 5. Confirmation

Success animation, order id, date, total, purchased items, shipping summary, payment method, and an estimated delivery window (3–5 days, configured in `constants/checkout.ts`). Actions: **View Orders** and **Continue Shopping**.

### 6. Order History

Lists orders newest-first with status badges, thumbnails, and totals. Clicking an order opens `OrderDetails` (full breakdown + reorder). Empty history shows a friendly empty state. The UI reads exclusively from `orderService`, so it can later be swapped to an API without component changes.

## Cart-Change Protection

When checkout begins, the flow captures a **cart fingerprint** (`[{ id, quantity }]` per item) in `snapshot`.

- If the cart prop changes while checkout is open, `cartChanged` becomes true.
- A warning banner appears: *"Your cart has changed. Please review your cart before placing the order."*
- **Place Order is disabled** until **Review updated cart** re-captures the fingerprint.
- The draft is also fingerprint-checked: a draft saved against a different cart is discarded on reopen.

## Empty-Cart Protection

- Opening checkout with an empty cart → blocked with a toast / empty state.
- Cart cleared mid-checkout → the empty state replaces the content.
- After completing an order (cart cleared) and reopening checkout → empty state.
- Place Order itself double-checks `items.length > 0`.

## Persistence

While checkout is open and valid, `checkoutService.saveCheckoutDraft` writes a **safe draft**:

```
{
  version: 1,
  step, shipping,
  payment: { method, cardName?, cardLast4?, upiId? },   // never cvv / full number
  cart: [{ id, quantity }],                            // fingerprint
  updatedAt
}
```

On reopen (or refresh), `bootCheckoutFromDraft` restores the draft **only if** the cart fingerprint still matches. Drafts are cleared after a successful order, when the cart is empty, or when the cart no longer matches. Card number, expiry, and CVV are intentionally absent from the draft and are never restored.

## Edge Cases Handled

| Case                              | Behavior                                                        |
| --------------------------------- | --------------------------------------------------------------- |
| Empty cart                        | Blocked entry + empty state in modal                            |
| Invalid shipping / payment data   | Inline errors, progression blocked                              |
| Refresh during checkout           | Safe draft restored (no card secrets)                           |
| Cart changed during checkout      | Warning banner, placement blocked until refreshed               |
| Cart cleared during checkout      | Empty state                                                      |
| Duplicate Place Order click       | `processingRef` guard + disabled button + processing UI         |
| Malformed localStorage            | Sanitized/filtered on read (cart, orders, draft)                |
| Missing product data              | Reorder skips products that no longer exist                     |
| Legacy Phase 1 orders             | Migrated to the current order shape by `sanitizeOrder`          |
