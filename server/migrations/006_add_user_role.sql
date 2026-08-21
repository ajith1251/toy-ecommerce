-- 006: Add role column to users table for admin/customer distinction

ALTER TABLE users ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'customer'
  CHECK (role IN ('customer', 'admin'));

-- Create index on role for faster admin lookups
CREATE INDEX IF NOT EXISTS idx_users_role ON users (role);