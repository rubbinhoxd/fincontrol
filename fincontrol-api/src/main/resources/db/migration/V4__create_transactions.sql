CREATE TABLE transactions (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id           UUID NOT NULL REFERENCES users(id),
    category_id       UUID NOT NULL REFERENCES categories(id),
    type              VARCHAR(10) NOT NULL CHECK (type IN ('INCOME', 'EXPENSE')),
    description       VARCHAR(200) NOT NULL,
    amount            DECIMAL(12,2) NOT NULL CHECK (amount > 0),
    transaction_date  DATE NOT NULL,
    planned           BOOLEAN NOT NULL DEFAULT true,
    fixed             BOOLEAN NOT NULL DEFAULT false,
    recurring         BOOLEAN NOT NULL DEFAULT false,
    subscription      BOOLEAN NOT NULL DEFAULT false,
    essential         BOOLEAN NOT NULL DEFAULT true,
    impulse           BOOLEAN NOT NULL DEFAULT false,
    notes             TEXT,
    created_at        TIMESTAMP NOT NULL DEFAULT now(),
    updated_at        TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX idx_transactions_user_date ON transactions(user_id, transaction_date);
CREATE INDEX idx_transactions_user_type_date ON transactions(user_id, type, transaction_date);
