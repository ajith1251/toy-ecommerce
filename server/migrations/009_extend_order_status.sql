-- 009: Extend orders.status to include 'pending' and 'paid'.
-- 'pending' covers draft/unconfirmed orders; 'paid' is set by the payment
-- webhook once a payment is captured. Replaces the CHECK constraint from
-- migration 002 (which only allowed confirmed/shipped/delivered/cancelled).

-- Drop the existing (possibly auto-named) CHECK constraint on status.
DO $$
DECLARE
  conname text;
BEGIN
  SELECT c.conname INTO conname
  FROM pg_constraint c
  JOIN pg_class t ON t.oid = c.conrelid
  JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = ANY (c.conkey)
  WHERE c.contype = 'c'
    AND t.relname = 'orders'
    AND a.attname = 'status'
  LIMIT 1;

  IF conname IS NOT NULL THEN
    EXECUTE format('ALTER TABLE orders DROP CONSTRAINT %I', conname);
  END IF;
END $$;

ALTER TABLE orders ADD CONSTRAINT orders_status_check
  CHECK (status IN ('pending', 'confirmed', 'paid', 'shipped', 'delivered', 'cancelled'));

CREATE INDEX IF NOT EXISTS idx_orders_status ON orders (status);
