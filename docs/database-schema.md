# Database Schema

ToyBox uses **PostgreSQL 18** (embedded for dev/tests, or any PostgreSQL ≥ 14
via `DATABASE_URL`). The schema covers the domain the application needs today:
catalog, orders, customer accounts (users, sessions, addresses, password
resets), and cart/wishlist state that is scoped to a user or an anonymous
client id.

Migrations live in `server/migrations/` and are applied in filename order by
`server/src/db/migrations.ts`, tracked in a `schema_migrations` table.
Re-running is a no-op.

## Categories

```sql
categories (
  id          text PRIMARY KEY,   -- slug, e.g. 'action-figures'
  name        text NOT NULL,
  icon        text NOT NULL DEFAULT '',
  color       text NOT NULL DEFAULT '',
  age_group   text NOT NULL CHECK (age_group IN ('kids','teens','adults')),
  description text NOT NULL DEFAULT '',
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
)
```

Category `id` is the URL slug the frontend already uses (`/category/:slug`).

## Brands

```sql
brands (
  id          integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name        text NOT NULL,
  slug        text NOT NULL UNIQUE,
  description text NOT NULL DEFAULT '',
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
)
```

## Products

```sql
products (
  id              integer PRIMARY KEY,     -- the frontend product id (1..54)
  slug            text NOT NULL UNIQUE,
  name            text NOT NULL,
  description     text NOT NULL DEFAULT '',
  price           numeric(10,2) NOT NULL CHECK (price >= 0),
  original_price  numeric(10,2) CHECK (original_price IS NULL OR original_price >= 0),
  category_id     text NOT NULL REFERENCES categories (id),
  brand_id        integer NOT NULL REFERENCES brands (id),
  age_group       text NOT NULL CHECK (age_group IN ('kids','teens','adults')),
  age_range       text NOT NULL DEFAULT '',
  rating          numeric(3,2) NOT NULL DEFAULT 0 CHECK (rating >= 0 AND rating <= 5),
  review_count    integer NOT NULL DEFAULT 0 CHECK (review_count >= 0),
  image           text NOT NULL DEFAULT '',
  stock_quantity  integer NOT NULL DEFAULT 0 CHECK (stock_quantity >= 0),
  is_active       boolean NOT NULL DEFAULT true,
  is_new          boolean NOT NULL DEFAULT false,
  is_bestseller   boolean NOT NULL DEFAULT false,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
)
```

- Products belong to **one** category (the frontend model is single-category,
  so no join table is needed).
- `inStock` is **derived** (`is_active AND stock_quantity > 0`) — it is never
  stored, and the server is the authoritative source of stock.
- Indexes cover category, brand, age group, price and rating for the filter
  API.

## Orders

```sql
orders (
  id               bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  order_number     text NOT NULL UNIQUE,    -- public id, e.g. TBX-20260817-8F4K2M
  client_id        text NOT NULL,           -- anonymous browser scoping (guests)
  user_id          bigint REFERENCES users (id),  -- authenticated owner (nullable)
  status           text NOT NULL DEFAULT 'confirmed'
                   CHECK (status IN ('confirmed','shipped','delivered','cancelled')),
  customer         jsonb NOT NULL,          -- { firstName, lastName, email, phone }
  shipping_address jsonb NOT NULL,          -- { line1, line2, city, state, postalCode, country }
  payment          jsonb NOT NULL,          -- safe snapshot ONLY (method, last4?, upiId?)
  pricing          jsonb NOT NULL,          -- { subtotal, discount, shipping, tax, grandTotal }
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
)

order_items (
  id           bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  order_id     bigint NOT NULL REFERENCES orders (id) ON DELETE CASCADE,
  product_id   integer NOT NULL,
  product_name text NOT NULL,               -- snapshot — never joins back to current pricing
  brand        text NOT NULL DEFAULT '',
  image        text NOT NULL DEFAULT '',
  unit_price   numeric(10,2) NOT NULL,      -- snapshot of the price at purchase time
  quantity     integer NOT NULL CHECK (quantity > 0),
  line_total   numeric(10,2) NOT NULL,
  created_at   timestamptz NOT NULL DEFAULT now()
)
```

- Order items snapshot name/price/image/brand so **historical orders never
  depend on current product data**.
- `order_number` is UNIQUE — the server generates it and retries on the
  (extremely rare) collision, so numbers are never reused.
- **Ownership:** authenticated orders carry `user_id` (FK → users); guests
  keep `client_id`. List/detail queries filter by the session user, then by
  client id — a user can never read another user's order.
- **Payment safety:** only `{ method, last4?, upiId? }` is ever stored. CVV,
  full card numbers and expiry are never written to the database (they never
  even leave the browser).

## Users

```sql
users (
  id            bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  email         text NOT NULL,             -- stored lowercase (normalized)
  password_hash text NOT NULL,             -- argon2id; plaintext never stored
  first_name, last_name, phone text NOT NULL DEFAULT '',
  status        text NOT NULL DEFAULT 'active'
                CHECK (status IN ('active','suspended')),
  created_at, updated_at timestamptz NOT NULL DEFAULT now(),
  last_login_at timestamptz
)
-- UNIQUE INDEX on lower(email) → email uniqueness enforced at the DB level,
-- case-insensitively (User@Example.com === user@example.com).
```

## Sessions

```sql
sessions (
  id           bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id      bigint NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  token_hash   text NOT NULL UNIQUE,       -- SHA-256 of the opaque cookie token
  created_at, last_seen_at timestamptz NOT NULL DEFAULT now(),
  expires_at   timestamptz NOT NULL,
  revoked_at   timestamptz                 -- non-null => logged out / revoked
)
```

- Multiple rows per user (one per device); logout / "logout all" / password
  change set `revoked_at`. Refresh rotates the token (new row, old row
  revoked).
- Only the token **hash** is stored — a database leak cannot be replayed.

## Addresses

```sql
addresses (
  id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id     bigint NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  label, first_name, last_name, phone, line2, state, country text DEFAULT '',
  line1, city, postal_code text NOT NULL,
  is_default  boolean NOT NULL DEFAULT false,
  created_at, updated_at timestamptz NOT NULL DEFAULT now()
)
```

The first saved address becomes the default; "set default" clears the
previous one. All queries are scoped `WHERE user_id = $1`.

## Password resets

```sql
password_resets (
  id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id     bigint NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  token_hash  text NOT NULL UNIQUE,        -- SHA-256 of the one-time token
  created_at  timestamptz NOT NULL DEFAULT now(),
  expires_at  timestamptz NOT NULL,        -- 30 min TTL
  used_at     timestamptz                  -- non-null => consumed
)
```

## Carts & wishlists (owner-scoped)

```sql
carts          (owner_key text PRIMARY KEY, user_id bigint UNIQUE REFERENCES users (id), …)
cart_items     (owner_key, product_id, quantity, PRIMARY KEY (owner_key, product_id))

wishlists      (owner_key text PRIMARY KEY, user_id bigint UNIQUE REFERENCES users (id), …)
wishlist_items (owner_key, product_id, PRIMARY KEY (owner_key, product_id))
```

`owner_key` is `user:<id>` for authenticated users or `client:<id>` for
anonymous guests — one cart/wishlist per owner. Ownership is resolved
server-side from the session (never from client input).

## Migrations & seeds

- `server/migrations/001_create_catalog.sql`, `002_create_orders.sql`,
  `003_create_cart_wishlist.sql`, `004_create_auth.sql` (users, sessions,
  addresses, password resets, `orders.user_id`, owner-scoped carts/wishlists).
- `server/seeds/seed.ts` transforms the existing frontend dataset
  (`src/data/products.ts`) into the database: 52 categories, 53 brands and 54
  products, with product ids matching the frontend exactly. Stock levels use a
  deterministic formula (`25 + (id × 7) % 70`). Idempotent (upserts).
- CLI: `npm run db:migrate`, `npm run db:seed`, `npm run db:reset` (reset
  warns that all development data will be destroyed).
