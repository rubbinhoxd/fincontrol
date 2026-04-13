ALTER TABLE transactions ADD COLUMN recurring_group_id UUID;

CREATE INDEX idx_transactions_recurring_group ON transactions(recurring_group_id)
    WHERE recurring_group_id IS NOT NULL;
