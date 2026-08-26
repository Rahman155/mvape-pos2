-- Migration: 013_create_stock_transfers_table
-- Description: Create stock_transfers table for inventory transfers

BEGIN;

CREATE TABLE IF NOT EXISTS stock_transfers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    from_location_id UUID NOT NULL,
    to_store_id UUID NOT NULL REFERENCES stores(id),
    transfer_date TIMESTAMP DEFAULT NOW(),
    status VARCHAR(50) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'COMPLETED', 'CANCELLED')),
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_stock_transfers_from_location_id ON stock_transfers(from_location_id);
CREATE INDEX idx_stock_transfers_to_store_id ON stock_transfers(to_store_id);
CREATE INDEX idx_stock_transfers_status ON stock_transfers(status);
CREATE INDEX idx_stock_transfers_transfer_date ON stock_transfers(transfer_date);

COMMIT;
