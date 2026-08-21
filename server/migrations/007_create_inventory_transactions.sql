-- Create inventory_transactions table for tracking stock changes

CREATE TABLE inventory_transactions (
    id SERIAL PRIMARY KEY,
    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    change_quantity INTEGER NOT NULL,
    reason VARCHAR(255) NOT NULL,
    reference_type VARCHAR(50), -- 'order', 'adjustment', 'purchase', etc.
    reference_id VARCHAR(100), -- Order ID or other reference
    performed_by INTEGER REFERENCES users(id), -- Admin/user who performed the action
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add indexes for common queries
CREATE INDEX idx_inventory_transactions_product_id ON inventory_transactions(product_id);
CREATE INDEX idx_inventory_transactions_created_at ON inventory_transactions(created_at);
CREATE INDEX idx_inventory_transactions_performed_by ON inventory_transactions(performed_by);
CREATE INDEX idx_inventory_transactions_reference ON inventory_transactions(reference_type, reference_id);