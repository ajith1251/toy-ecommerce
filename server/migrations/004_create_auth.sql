-- 004: Customer accounts — users, sessions, addresses, password resets.
-- Carts/wishlists move from client-scoped keys to owner-scoped keys so an
-- authenticated user's cart is tied to the account (not a browser id).
--
-- NOTE: this is a development migration — cart/wishlist tables are rebuilt
-- (guest carts are preserved and merged into accounts on login).

CREATE TABLE IF NOT EXISTS users (
  id              bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  email           text NOT NULL,                -- stored lowercase (normalized)
  password_hash   text NOT NULL,                -- argon2id; plaintext never stored
  first_name      text NOT NULL DEFAULT '',
  last_name       text NOT NULL DEFAULT '',
  phone           text NOT NULL DEFAULT '',
  status          text NOT NULL DEFAULT 'active'
                  CHECK (status IN ('active', 'suspended')),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  last_login_at   timestamptz
);

-- Email uniqueness enforced at the database level, case-insensitively.
CREATE UNIQUE INDEX IF NOT EXISTS uq_users_email ON users (lower(email));

CREATE TABLE IF NOT EXISTS sessions (
  id            bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id       bigint NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  token_hash    text NOT NULL UNIQUE,           -- SHA-256 of the opaque cookie token
  created_at    timestamptz NOT NULL DEFAULT now(),
  expires_at    timestamptz NOT NULL,
  revoked_at    timestamptz,                    -- non-null => logged out / revoked
  last_seen_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions (user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions (token_hash);

CREATE TABLE IF NOT EXISTS addresses (
  id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id     bigint NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  label       text NOT NULL DEFAULT '',
  first_name  text NOT NULL DEFAULT '',
  last_name   text NOT NULL DEFAULT '',
  phone       text NOT NULL DEFAULT '',
  line1       text NOT NULL,
  line2       text NOT NULL DEFAULT '',
  city        text NOT NULL,
  state       text NOT NULL DEFAULT '',
  postal_code text NOT NULL,
  country     text NOT NULL DEFAULT '',
  is_default  boolean NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_addresses_user ON addresses (user_id);

CREATE TABLE IF NOT EXISTS password_resets (
  id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id     bigint NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  token_hash  text NOT NULL UNIQUE,             -- SHA-256 of the one-time token
  created_at  timestamptz NOT NULL DEFAULT now(),
  expires_at  timestamptz NOT NULL,
  used_at     timestamptz                       -- non-null => consumed
);

CREATE INDEX IF NOT EXISTS idx_password_resets_user ON password_resets (user_id);

-- ── Ownership ────────────────────────────────────────────────────────────
-- Orders: authenticated orders carry user_id; guests keep client_id scoping.
ALTER TABLE orders ADD COLUMN IF NOT EXISTS user_id bigint REFERENCES users (id);
CREATE INDEX IF NOT EXISTS idx_orders_user ON orders (user_id, created_at DESC);

-- Carts/wishlists: rebuilt keyed by owner_key. Guests use `client:<clientId>`,
-- authenticated users use `user:<userId>` (one cart per account).
DROP TABLE IF EXISTS cart_items;
DROP TABLE IF EXISTS carts;
DROP TABLE IF EXISTS wishlist_items;
DROP TABLE IF EXISTS wishlists;

CREATE TABLE IF NOT EXISTS carts (
  owner_key   text PRIMARY KEY,
  user_id     bigint UNIQUE REFERENCES users (id) ON DELETE CASCADE,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS cart_items (
  owner_key   text NOT NULL REFERENCES carts (owner_key) ON DELETE CASCADE,
  product_id  integer NOT NULL REFERENCES products (id) ON DELETE CASCADE,
  quantity    integer NOT NULL CHECK (quantity > 0),
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (owner_key, product_id)
);

CREATE INDEX IF NOT EXISTS idx_cart_items_product ON cart_items (product_id);

CREATE TABLE IF NOT EXISTS wishlists (
  owner_key   text PRIMARY KEY,
  user_id     bigint UNIQUE REFERENCES users (id) ON DELETE CASCADE,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS wishlist_items (
  owner_key   text NOT NULL REFERENCES wishlists (owner_key) ON DELETE CASCADE,
  product_id  integer NOT NULL REFERENCES products (id) ON DELETE CASCADE,
  created_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (owner_key, product_id)
);

CREATE INDEX IF NOT EXISTS idx_wishlist_items_product ON wishlist_items (product_id);
