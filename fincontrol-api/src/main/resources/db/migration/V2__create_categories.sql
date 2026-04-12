CREATE TABLE categories (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES users(id),
    name        VARCHAR(60) NOT NULL,
    type        VARCHAR(10) NOT NULL CHECK (type IN ('INCOME', 'EXPENSE')),
    icon        VARCHAR(30),
    color       VARCHAR(7),
    active      BOOLEAN NOT NULL DEFAULT true,
    created_at  TIMESTAMP NOT NULL DEFAULT now(),
    UNIQUE(user_id, name, type)
);
