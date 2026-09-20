-- Adiciona campos pra verificacao de email
-- Novos users precisam confirmar via link enviado pro email antes de logar.
-- Users existentes (grandfather) sao marcados como ja verificados via migration V12.

ALTER TABLE users
    ADD COLUMN email_verified BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN verification_token VARCHAR(64),
    ADD COLUMN verification_token_expires_at TIMESTAMP;

CREATE INDEX idx_users_verification_token ON users(verification_token) WHERE verification_token IS NOT NULL;
