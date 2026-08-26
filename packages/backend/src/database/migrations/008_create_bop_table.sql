-- Migration: 008_create_bop_table
-- Description: Create bop (Biaya Operasional Penjualan) table

BEGIN;

CREATE TABLE IF NOT EXISTS bop (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES stores(id),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    amount DECIMAL(10, 2) NOT NULL,
    effective_from DATE NOT NULL,
    effective_to DATE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_bop_store_id ON bop(store_id);
CREATE INDEX idx_bop_effective_from ON bop(effective_from);
CREATE INDEX idx_bop_store_date ON bop(store_id, effective_from DESC);

COMMIT;
