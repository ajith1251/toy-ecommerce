-- 002: Orders — server-authoritative order storage.
-- Order items snapshot name/price/image/brand so historical orders never
-- depend on current product pricing. Payment is a safe snapshot only
-- (method, last4, upiId) — CVV and full card numbers are never stored.

CREATE TABLE IF NOT EXISTS orders (
  id             bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  order_number   text NOT NULL UNIQUE,       -- public id, e.g. TBX-20260817-8F4K2M
  client_id      text NOT NULL,              -- anonymous browser identifier (not auth)
  status         text NOT NULL DEFAULT 'confirmed'
                 CHECK (status IN ('confirmed', 'shipped', 'delivered', 'cancelled')),
  customer       jsonb NOT NULL,             -- { firstName, lastName, email, phone }
  shipping_address jsonb NOT NULL,           -- { line1, line2, city, state, postalCode, country }
  payment        jsonb NOT NULL,             -- safe snapshot: { method, last4?, upiId? }
  pricing        jsonb NOT NULL,             -- { subtotal, discount, shipping, tax, grandTotal }
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_orders_client ON orders (client_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_order_number ON orders (order_number);

CREATE TABLE IF NOT EXISTS order_items (
  id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  order_id    bigint NOT NULL REFERENCES orders (id) ON DELETE CASCADE,
  product_id  integer NOT NULL,
  product_name text NOT NULL,
  brand       text NOT NULL DEFAULT '',
  image       text NOT NULL DEFAULT '',
  unit_price  numeric(10, 2) NOT NULL,
  quantity    integer NOT NULL CHECK (quantity > 0),
  line_total  numeric(10, 2) NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items (order_id);
