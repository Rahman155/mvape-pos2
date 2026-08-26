-- Migration: 014_create_stock_transfer_items_table
-- Description: Create stock_transfer_items table

BEGIN;

CREATE TABLE IF NOT EXISTS stock_transfer_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    stock_transfer_id UUID NOT NULL REFERENCES stock_transfers(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id),
    quantity INT NOT NULL,
    received_quantity INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_stock_transfer_items_stock_transfer_id ON stock_transfer_items(stock_transfer_id);
CREATE INDEX idx_stock_transfer_items_product_id ON stock_transfer_items(product_id);

COMMIT;
