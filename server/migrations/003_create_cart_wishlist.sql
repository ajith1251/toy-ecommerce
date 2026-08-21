-- 003: Anonymous cart + wishlist (no user accounts yet — scoped by client_id).

CREATE TABLE IF NOT EXISTS carts (
  client_id  text PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS cart_items (
  client_id  text NOT NULL REFERENCES carts (client_id) ON DELETE CASCADE,
  product_id integer NOT NULL REFERENCES products (id) ON DELETE CASCADE,
  quantity   integer NOT NULL CHECK (quantity > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (client_id, product_id)
);

CREATE TABLE IF NOT EXISTS wishlists (
  client_id  text PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS wishlist_items (
  client_id  text NOT NULL REFERENCES wishlists (client_id) ON DELETE CASCADE,
  product_id integer NOT NULL REFERENCES products (id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (client_id, product_id)
);
