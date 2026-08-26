-- Migration: 012_create_piutang_table
-- Description: Create piutang (payable/receivable) table

BEGIN;

CREATE TABLE IF NOT EXISTS piutang (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id UUID REFERENCES transactions(id),
    member_id UUID REFERENCES members(id),
    amount DECIMAL(12, 2) NOT NULL,
    remaining_balance DECIMAL(12, 2) NOT NULL,
    due_date DATE,
    status VARCHAR(50) DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'PARTIAL', 'CLOSED')),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_piutang_transaction_id ON piutang(transaction_id);
CREATE INDEX idx_piutang_member_id ON piutang(member_id);
CREATE INDEX idx_piutang_status ON piutang(status);
CREATE INDEX idx_piutang_due_date ON piutang(due_date);

COMMIT;
