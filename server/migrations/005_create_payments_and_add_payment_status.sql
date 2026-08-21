-- 005: Payments table and payment status on orders

CREATE TABLE IF NOT EXISTS payments (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  order_id bigint NOT NULL REFERENCES orders (id) ON DELETE CASCADE,
  provider text NOT NULL DEFAULT 'razorpay',
  provider_order_id text NOT NULL,
  provider_payment_id text,
  method text NOT NULL, -- 'card', 'upi', 'cod'
  amount integer NOT NULL, -- amount in minor units (paise for INR)
  currency text NOT NULL DEFAULT 'INR',
  status text NOT NULL CHECK (status IN ('pending', 'authorized', 'captured', 'failed', 'cancelled', 'refunded')),
  failure_code text,
  failure_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  captured_at timestamptz
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_payments_provider_order_id ON payments (provider_order_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_payments_provider_payment_id ON payments (provider_payment_id) WHERE provider_payment_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_payments_order_id ON payments (order_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments (status);

-- Add payment_status to orders for quick access (duplicated from payments.status for performance)
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_status text NOT NULL DEFAULT 'pending'
  CHECK (payment_status IN ('pending', 'authorized', 'captured', 'failed', 'cancelled', 'refunded'));

CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON orders (payment_status);