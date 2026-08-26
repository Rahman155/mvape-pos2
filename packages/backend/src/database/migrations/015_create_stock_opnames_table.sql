-- Migration: 015_create_stock_opnames_table
-- Description: Create stock_opnames table for stock verification

BEGIN;

CREATE TABLE IF NOT EXISTS stock_opnames (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES stores(id),
    opname_date TIMESTAMP DEFAULT NOW(),
    status VARCHAR(50) DEFAULT 'ONGOING' CHECK (status IN ('ONGOING', 'COMPLETED', 'VERIFIED')),
    conducted_by UUID NOT NULL REFERENCES users(id),
    verified_by UUID REFERENCES users(id),
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_stock_opnames_store_id ON stock_opnames(store_id);
CREATE INDEX idx_stock_opnames_status ON stock_opnames(status);
CREATE INDEX idx_stock_opnames_opname_date ON stock_opnames(opname_date);
CREATE INDEX idx_stock_opnames_conducted_by ON stock_opnames(conducted_by);

COMMIT;
