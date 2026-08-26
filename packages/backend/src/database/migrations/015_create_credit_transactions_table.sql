-- Migration: 015_create_credit_transactions_table
-- Description: Create credit_transactions table for member credit top-ups and deductions

BEGIN;

CREATE TABLE IF NOT EXISTS credit_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    member_id UUID NOT NULL REFERENCES members(id),
    transaction_type VARCHAR(50) NOT NULL CHECK (transaction_type IN ('TOPUP', 'DEDUCT', 'PAYMENT')),
    amount DECIMAL(12, 2) NOT NULL,
    previous_balance DECIMAL(12, 2) NOT NULL,
    new_balance DECIMAL(12, 2) NOT NULL,
    notes TEXT,
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for efficient queries
CREATE INDEX idx_credit_transactions_member_id ON credit_transactions(member_id);
CREATE INDEX idx_credit_transactions_created_at ON credit_transactions(created_at DESC);
CREATE INDEX idx_credit_transactions_type ON credit_transactions(transaction_type);
CREATE INDEX idx_credit_transactions_member_date ON credit_transactions(member_id, created_at DESC);

COMMIT;
