-- Migration: 005_create_transactions_table
-- Description: Create transactions table for POS sales

BEGIN;

CREATE TABLE IF NOT EXISTS transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES stores(id),
    kasir_id UUID NOT NULL REFERENCES users(id),
    transaction_date TIMESTAMP NOT NULL,
    total_amount DECIMAL(12, 2) NOT NULL,
    payment_method VARCHAR(50) NOT NULL CHECK (payment_method IN ('CASH', 'MEMBER_CREDIT', 'TEMPO')),
    status VARCHAR(50) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'COMPLETED', 'CANCELLED')),
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    edited_at TIMESTAMP,
    edited_by UUID REFERENCES users(id),
    is_edited BOOLEAN DEFAULT false,
    version INT DEFAULT 1
);

-- Create indexes
CREATE INDEX idx_transactions_store_id ON transactions(store_id);
CREATE INDEX idx_transactions_kasir_id ON transactions(kasir_id);
CREATE INDEX idx_transactions_transaction_date ON transactions(transaction_date);
CREATE INDEX idx_transactions_status ON transactions(status);
CREATE INDEX idx_transactions_payment_method ON transactions(payment_method);
CREATE INDEX idx_transactions_created_at ON transactions(created_at);
CREATE INDEX idx_transactions_store_date ON transactions(store_id, transaction_date DESC);

COMMIT;
