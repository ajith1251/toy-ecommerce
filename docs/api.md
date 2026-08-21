# ToyBox REST API

Base URL (local dev): `http://localhost:4000/api`

## Conventions

- **Response envelope:** `{ "data": … }`
- **Error envelope:** `{ "error": { "code", "message", "details?" } }`
- **Pagination:** product lists return `{ data, meta: { page, limit, total, totalPages } }`.
- **Ownership:** carts, wishlists and orders are scoped to the
  **authenticated user** when a session cookie is present, or to the
  anonymous `X-Client-Id` header for guests. Ownership is always derived
  server-side from the session — client-supplied user ids are never trusted.
- **Status codes:** `400` validation, `401` unauthorized, `403` forbidden
  (cross-origin mutation), `404` not found (also used for other users'
  resources — authorization-safe), `409` conflict / `insufficient_stock` /
  `email_taken`, `422` validation, `429` rate limited, `500` internal (safe
  message).

## Health

### `GET /api/health/live`

Liveness — the process is up; no dependency checks (container restarts
should key off this, never off a DB blip).

```json
{ "data": { "status": "live", "timestamp": "…" } }
```

### `GET /api/health/ready`

Readiness — process **and** PostgreSQL reachable. Load balancers route
traffic only while this returns 200.

```json
{ "data": { "status": "ready", "db": "up", "timestamp": "…" } }
```

### `GET /api/health` (legacy)

Combined check kept for existing monitors: `200` + `{ status: "ok" }` when
the DB is reachable, `503` + `{ status: "degraded" }` otherwise.

### Error envelope correlation

Every error response includes a correlation id, also echoed as the
`X-Request-Id` response header:

```json
{ "error": { "code": "not_found", "message": "…", "requestId": "…" } }
```

## Products

### `GET /api/products`

Query parameters (all optional):

| Param      | Values                                          |
| ---------- | ----------------------------------------------- |
| `q`        | case-insensitive search over name/description/brand |
| `category` | category slug, e.g. `stem-toys`                 |
| `brand`    | brand slug, e.g. `playtime`                     |
| `minPrice` / `maxPrice` | price bounds                        |
| `minRating`| minimum rating (0–5)                            |
| `inStock`  | `true` → only products with stock               |
| `sort`     | `newest` (default), `price-asc`, `price-desc`, `rating`, `bestseller` |
| `page` / `limit` | pagination (`limit` max 250)              |

```json
{
  "data": [ { "id": 1, "name": "Hero Squad Action Pack", "price": 34.99,
              "category": "action-figures", "brand": "PlayTime", "ageGroup": "kids",
              "rating": 4.7, "reviewCount": 234, "image": "…", "inStock": true,
              "stockQuantity": 32, "isNew": true, "isBestseller": false, "slug": "…" } ],
  "meta": { "page": 1, "limit": 24, "total": 54, "totalPages": 3 }
}
```

### `GET /api/products/:id` — one product by numeric id (404 if unknown)
### `GET /api/products/slug/:slug` — one product by slug

## Categories & Brands

### `GET /api/categories` — all categories
### `GET /api/categories/:slug` — e.g. `/api/categories/stem-toys`
### `GET /api/brands` — all brands (alphabetical)
### `GET /api/brands/:slug` — e.g. `/api/brands/playtime`

Category shape: `{ id, slug, name, icon, color, ageGroup }` (id == slug).

## Authentication

Sessions ride an HttpOnly cookie (`toybox_session`); no tokens are exposed to
JavaScript. Auth endpoints are rate-limited (stricter than the general API).
See [auth-architecture.md](auth-architecture.md) and
[auth-security.md](auth-security.md).

### `POST /api/auth/register` — create an account and log in

```json
{ "email": "jane@example.com", "password": "Password123!",
  "firstName": "Jane", "lastName": "Doe", "phone": "+1 555 000 0000" }
```

- `201` sets the session cookie and returns `{ "data": { "user": { id, email,
  firstName, lastName, phone, createdAt } } }` — never the password hash.
- `409 email_taken` when the (normalized) email is already registered.
- `422` when the password is shorter than 8 characters.

### `POST /api/auth/login` — authenticate and set the session cookie

```json
{ "email": "jane@example.com", "password": "Password123!" }
```

- `200` returns the safe user object and sets the cookie; updates
  `last_login_at`.
- Invalid credentials → `401` with the generic **"Invalid email or
  password"** (no account enumeration). Suspended accounts get a generic
  suspension message.

### `POST /api/auth/logout` — revoke the current session (requires auth)
### `POST /api/auth/logout-all` — revoke every session for the user (requires auth)
### `POST /api/auth/refresh` — rotate the session token and slide expiry (requires auth)
### `GET /api/auth/me` — current user, `{ "data": { "user": … } }`, or `401`

### `POST /api/auth/merge` — guest → account migration (requires auth + `X-Client-Id`)

```json
{ "cartItems": [{ "productId": 1, "quantity": 1 }], "wishlistIds": [2] }
```

Merges the guest's server cart (`client:<id>`) plus client-supplied
localStorage items into the account cart (quantities summed, capped at
stock), unions the wishlist (duplicates collapse), and claims same-browser
anonymous orders. Returns `{ cart, wishlist, capped }` where `capped` lists
items that were limited to available stock.

### `POST /api/auth/forgot-password` — request a reset link by email

```json
{ "email": "jane@example.com" }
```

Always returns `200` with the same shape (`{ ok: true }`) whether or not the
email exists (no enumeration). The one-time reset link is **delivered by
email only** — the response never contains the token. Delivery transports:
`console` (dev default, logs the link), `file` (JSONL outbox for tests), or
`smtp` (nodemailer; `EMAIL_TRANSPORT=smtp` + `SMTP_*`). See
[auth-architecture.md](auth-architecture.md).

### `POST /api/auth/reset-password`

```json
{ "token": "…", "password": "NewPassword123!" }
```

Validates the one-time token (hashed at rest, 30-min TTL, single-use), resets
the password, revokes the user's other sessions, and invalidates the token.

## Account (all require auth)

### `GET /api/account/profile` — safe user fields
### `PATCH /api/account/profile` — update `{ firstName?, lastName?, phone? }`
### `PATCH /api/account/password` — `{ currentPassword, newPassword }`

Verifies the current password; revokes all **other** sessions.

### `GET /api/account/addresses` — list (default first)
### `POST /api/account/addresses` — create (first address becomes default)
### `PATCH /api/account/addresses/:id` — update (full address body)
### `DELETE /api/account/addresses/:id`
### `POST /api/account/addresses/:id/default` — make default (clears the old one)

Address body: `{ label, firstName, lastName, phone, line1, line2, city,
state, postalCode, country }`. All scoped to the session user; other users'
addresses behave as `404`.

## Admin (all require auth **and** the `admin` role)

Every `/api/admin/*` endpoint is guarded server-side by the session
middleware plus a role check — a customer token receives `403`, an
anonymous request `401`. All list endpoints accept `page` / `limit`
(default 20) and return `{ data, pagination: { page, limit, total,
totalPages } }`. Mutating actions are recorded in `admin_audit_logs`.

### `GET /api/admin/dashboard` — KPIs

```json
{ "revenue": 0, "orders": 0, "customers": 0, "products": 0,
  "lowStock": 0, "pendingPayments": 0 }
```

Revenue is the sum of captured payments (major units); low stock counts
active products with ≤ 10 units.

### Products

- `GET /api/admin/products` — filters: `search`, `status` (`active`/`inactive`)
- `GET /api/admin/products/:id`
- `POST /api/admin/products` — full product body (see `schemas/product.ts`)
- `PATCH /api/admin/products/:id` — partial update
- `DELETE /api/admin/products/:id` — soft delete (deactivates)

### Categories & brands

- `GET /api/admin/categories` · `POST` · `PATCH /:id` · `DELETE /:id`
  (delete refuses while products reference the category → `409 conflict`)
- `GET /api/admin/brands` · `POST` · `PATCH /:id` · `DELETE /:id`
  (same referential-integrity guard)

### Inventory

- `GET /api/admin/inventory` — filters: `search`, `stock`
  (`in-stock`/`low-stock`/`out-of-stock`)
- `POST /api/admin/inventory/:productId/adjust` —
  `{ quantityDelta, reason, referenceType?, referenceId? }`; row-locked,
  refuses negative stock (`409 insufficient_stock`) and writes an
  `inventory_transactions` row in the same transaction.

### Orders

- `GET /api/admin/orders` — filters: `status`, `paymentStatus`, `customer`
- `GET /api/admin/orders/:orderNumber` — includes items
- `PATCH /api/admin/orders/:id/status` — `{ status }`; validated against the
  transition table (`pending → confirmed/cancelled → paid …`), invalid moves
  get `400 invalid_transition`

### Customers

- `GET /api/admin/customers` — filters: `search`, `status`
  (`active`/`inactive`); admins are never listed
- `GET /api/admin/customers/:id`
- `PATCH /api/admin/customers/:id/status` — `{ status: 'active' | 'suspended' }`

### Payments & audit logs

- `GET /api/admin/payments` — filters: `status`, `method`, `amountMin`,
  `amountMax`, `customer`
- `GET /api/admin/payments/:id`
- `GET /api/admin/audit-logs` — filters: `entityType`, `adminUserId`,
  `startDate`, `endDate`

## Orders

### `POST /api/orders` — place an order (requires `X-Client-Id`; ownership from session when logged in)

```json
{
  "items": [{ "productId": 1, "quantity": 2 }],
  "shipping": { "firstName": "Jane", "lastName": "Doe", "email": "jane@example.com",
                "phone": "+1 555 123 4567", "line1": "123 Toy Lane", "line2": "",
                "city": "Springfield", "state": "CA", "postalCode": "90210", "country": "United States" },
  "payment": { "method": "card", "last4": "4242" }
}
```

- `payment.method`: `card` (requires `last4`), `upi` (requires `upiId`), `cod`.
- The server validates products, checks stock, recalculates **all** totals
  from current database prices, generates the order number, and persists in a
  single transaction (stock decremented atomically). Client-supplied totals,
  prices, discounts and order ids are ignored/rejected.
- `201` returns the created order: `{ id: "TBX-20260817-8F4K2M", status:
  "confirmed", customer, shippingAddress, payment, items, pricing,
  createdAt }`.
- `409 insufficient_stock` when stock changed since add-to-cart.

### `GET /api/orders` — list the authenticated user's orders (or the guest client's)
### `GET /api/orders/:orderNumber` — one order (scoped to the owner; 404 for other users' orders)

Authenticated users see only their own orders; anonymous orders created in
the same browser before registration are claimed for the account on merge.

### Order lifecycle

Orders are created as `confirmed`. The payment webhook moves them to
`paid` once a payment is captured; admins can move orders along
`pending → confirmed → paid → shipped → delivered` (plus `cancelled`)
via the admin status endpoint. Transitions are validated server-side.

## Cart (ownership from session when logged in, else `X-Client-Id`)

### `GET /api/cart`
### `POST /api/cart/items` — `{ "productId": 1, "quantity": 2 }` (quantity defaults to 1)
### `PATCH /api/cart/items/:productId` — `{ "quantity": 5 }` (`0` removes the item)
### `DELETE /api/cart/items/:productId`
### `DELETE /api/cart` — clear

Authenticated requests are scoped to the session user; guests use
`X-Client-Id`. Items return the current product snapshot.

## Wishlist (ownership from session when logged in, else `X-Client-Id`)

### `GET /api/wishlist`
### `POST /api/wishlist/items/:productId`
### `DELETE /api/wishlist/items/:productId`

Authenticated requests are scoped to the session user; guests use
`X-Client-Id`. Returns full product objects.

## Frontend consumption

- The frontend talks to this API exclusively through
  `src/lib/api/client.ts` (products, categories, brands, orders, auth and
  account). The catalog is fetched once at boot by `CatalogBoundary`
  (`/products?limit=250` — the app filters/sorts client-side over the full
  set), and orders go straight to the server.
- **Authenticated** carts and wishlists are server-backed (the session
  cookie scopes them); guests keep localStorage, which is merged into the
  account on registration/login. Theme, recently-viewed and checkout drafts
  remain client-side. See `docs/backend-architecture.md` and
  `docs/auth-architecture.md`.
