-- Migration: 002_create_stores_table
-- Description: Create stores table for multi-store support

BEGIN;

CREATE TABLE IF NOT EXISTS stores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    address TEXT,
    phone VARCHAR(20),
    logo_url VARCHAR(512),
    operating_hours JSONB,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'
);

-- Create indexes
CREATE INDEX idx_stores_name ON stores(name);
CREATE INDEX idx_stores_is_active ON stores(is_active);

-- Add foreign key constraint to users table
ALTER TABLE users ADD CONSTRAINT fk_users_store_id 
    FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE SET NULL;

COMMIT;
