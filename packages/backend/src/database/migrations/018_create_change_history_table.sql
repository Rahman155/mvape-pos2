-- Migration: 018_create_change_history_table
-- Description: Create change_history table for audit trail

BEGIN;

CREATE TABLE IF NOT EXISTS change_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type VARCHAR(100) NOT NULL,
    entity_id UUID NOT NULL,
    changed_by UUID NOT NULL REFERENCES users(id),
    change_type VARCHAR(50) NOT NULL CHECK (change_type IN ('CREATE', 'UPDATE', 'DELETE')),
    old_values JSONB,
    new_values JSONB,
    timestamp TIMESTAMP DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_change_history_entity_type ON change_history(entity_type);
CREATE INDEX idx_change_history_entity_id ON change_history(entity_id);
CREATE INDEX idx_change_history_changed_by ON change_history(changed_by);
CREATE INDEX idx_change_history_change_type ON change_history(change_type);
CREATE INDEX idx_change_history_timestamp ON change_history(timestamp DESC);
CREATE INDEX idx_change_history_entity_id_timestamp ON change_history(entity_id, timestamp DESC);

COMMIT;
