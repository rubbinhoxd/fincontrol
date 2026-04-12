ALTER TABLE transactions ADD COLUMN installment_group_id UUID;
ALTER TABLE transactions ADD COLUMN current_installment INTEGER;
ALTER TABLE transactions ADD COLUMN total_installments INTEGER;

ALTER TABLE transactions ADD CONSTRAINT chk_installment_fields CHECK (
    (installment_group_id IS NULL AND current_installment IS NULL AND total_installments IS NULL)
    OR
    (installment_group_id IS NOT NULL AND current_installment IS NOT NULL AND total_installments IS NOT NULL
     AND current_installment >= 1 AND total_installments >= 2 AND current_installment <= total_installments)
);

CREATE INDEX idx_transactions_installment_group ON transactions(installment_group_id)
    WHERE installment_group_id IS NOT NULL;
