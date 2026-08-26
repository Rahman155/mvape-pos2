-- Migration: 016_create_opname_details_table
-- Description: Create opname_details table for opname item details

BEGIN;

CREATE TABLE IF NOT EXISTS opname_details (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    opname_id UUID NOT NULL REFERENCES stock_opnames(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id),
    system_quantity INT NOT NULL,
    physical_quantity INT NOT NULL,
    difference INT,
    status VARCHAR(50) DEFAULT 'MATCH' CHECK (status IN ('MATCH', 'SHORTAGE', 'EXCESS')),
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_opname_details_opname_id ON opname_details(opname_id);
CREATE INDEX idx_opname_details_product_id ON opname_details(product_id);
CREATE INDEX idx_opname_details_status ON opname_details(status);

COMMIT;
