-- Relaxa a constraint de parcelamento pra permitir parcelas "standalone" importadas de fatura:
-- currentInstallment e totalInstallments podem estar setados SEM installmentGroupId.
-- Alem disso, currentInstallment pode ser NULL quando so o total e conhecido (comum em faturas BB
-- que mostram "Parc=112steam" — voce sabe que sao 12 parcelas mas nao qual a atual).

ALTER TABLE transactions DROP CONSTRAINT IF EXISTS chk_installment_fields;

ALTER TABLE transactions ADD CONSTRAINT chk_installment_fields CHECK (
    -- Caso 1: transacao sem informacao de parcelamento
    (current_installment IS NULL AND total_installments IS NULL AND installment_group_id IS NULL)
    OR
    -- Caso 2: tem info de parcela (total obrigatorio, current opcional, group opcional)
    (total_installments IS NOT NULL
        AND total_installments >= 2
        AND (current_installment IS NULL OR (current_installment >= 1 AND current_installment <= total_installments))
    )
);
