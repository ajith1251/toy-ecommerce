-- 001: Catalog — categories, brands, products
-- Mirrors the frontend domain (src/types): one category per product, brand
-- as a foreign key, numeric ids matching the frontend product ids.

CREATE TABLE IF NOT EXISTS categories (
  id          text PRIMARY KEY,              -- slug, e.g. 'action-figures'
  name        text NOT NULL,
  icon        text NOT NULL DEFAULT '',
  color       text NOT NULL DEFAULT '',
  age_group   text NOT NULL CHECK (age_group IN ('kids', 'teens', 'adults')),
  description text NOT NULL DEFAULT '',
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS brands (
  id          integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name        text NOT NULL,
  slug        text NOT NULL UNIQUE,
  description text NOT NULL DEFAULT '',
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS products (
  id              integer PRIMARY KEY,       -- frontend product id (1..54)
  slug            text NOT NULL UNIQUE,
  name            text NOT NULL,
  description     text NOT NULL DEFAULT '',
  price           numeric(10, 2) NOT NULL CHECK (price >= 0),
  original_price  numeric(10, 2) CHECK (original_price IS NULL OR original_price >= 0),
  category_id     text NOT NULL REFERENCES categories (id),
  brand_id        integer NOT NULL REFERENCES brands (id),
  age_group       text NOT NULL CHECK (age_group IN ('kids', 'teens', 'adults')),
  age_range       text NOT NULL DEFAULT '',
  rating          numeric(3, 2) NOT NULL DEFAULT 0 CHECK (rating >= 0 AND rating <= 5),
  review_count    integer NOT NULL DEFAULT 0 CHECK (review_count >= 0),
  image           text NOT NULL DEFAULT '',
  stock_quantity  integer NOT NULL DEFAULT 0 CHECK (stock_quantity >= 0),
  is_active       boolean NOT NULL DEFAULT true,
  is_new          boolean NOT NULL DEFAULT false,
  is_bestseller   boolean NOT NULL DEFAULT false,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_products_category ON products (category_id);
CREATE INDEX IF NOT EXISTS idx_products_brand ON products (brand_id);
CREATE INDEX IF NOT EXISTS idx_products_age_group ON products (age_group);
CREATE INDEX IF NOT EXISTS idx_products_price ON products (price);
CREATE INDEX IF NOT EXISTS idx_products_rating ON products (rating);
