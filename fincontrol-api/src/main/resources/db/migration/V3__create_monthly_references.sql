CREATE TABLE monthly_references (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES users(id),
    year_month  VARCHAR(7) NOT NULL,
    salary      DECIMAL(12,2) NOT NULL,
    notes       TEXT,
    created_at  TIMESTAMP NOT NULL DEFAULT now(),
    updated_at  TIMESTAMP NOT NULL DEFAULT now(),
    UNIQUE(user_id, year_month)
);
