CREATE TABLE cards (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id),
    name            VARCHAR(60) NOT NULL,
    color           VARCHAR(7),
    brand           VARCHAR(40),
    closing_day     INTEGER NOT NULL CHECK (closing_day BETWEEN 1 AND 31),
    due_day         INTEGER NOT NULL CHECK (due_day BETWEEN 1 AND 31),
    credit_limit    DECIMAL(12,2) NOT NULL CHECK (credit_limit > 0),
    active          BOOLEAN NOT NULL DEFAULT true,
    created_at      TIMESTAMP NOT NULL DEFAULT now(),
    updated_at      TIMESTAMP NOT NULL DEFAULT now(),
    UNIQUE(user_id, name)
);

ALTER TABLE transactions ADD COLUMN card_id UUID REFERENCES cards(id);

CREATE INDEX idx_transactions_card_date ON transactions(user_id, card_id, transaction_date)
    WHERE card_id IS NOT NULL;
