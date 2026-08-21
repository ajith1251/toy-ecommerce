-- Create admin_audit_logs table for tracking administrative actions

CREATE TABLE admin_audit_logs (
    id SERIAL PRIMARY KEY,
    admin_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(255) NOT NULL,
    entity_type VARCHAR(100) NOT NULL, -- 'product', 'order', 'user', 'category', 'brand', etc.
    entity_id VARCHAR(100), -- ID of the affected entity
    changes JSONB, -- Stores what changed (JSON format)
    ip_address INET, -- IP address of the admin who performed the action
    user_agent TEXT, -- User agent of the admin's browser
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add indexes for common queries
CREATE INDEX idx_admin_audit_logs_admin_user_id ON admin_audit_logs(admin_user_id);
CREATE INDEX idx_admin_audit_logs_created_at ON admin_audit_logs(created_at);
CREATE INDEX idx_admin_audit_logs_entity_type ON admin_audit_logs(entity_type);
CREATE INDEX idx_admin_audit_logs_entity ON admin_audit_logs(entity_type, entity_id);
CREATE INDEX idx_admin_audit_logs_action ON admin_audit_logs(action);