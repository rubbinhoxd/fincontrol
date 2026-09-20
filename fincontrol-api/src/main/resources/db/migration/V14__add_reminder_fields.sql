-- Suporte a lembretes de inatividade por email
-- notifications_enabled: opt-out. Default true (LGPD: link no email desativa).
-- last_reminder_sent_at: quando foi o ultimo email de lembrete
-- reminder_count: quantos lembretes seguidos foram mandados (zera quando o
--                 usuario cria transacao). Usado no calculo do backoff.

ALTER TABLE users
    ADD COLUMN notifications_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    ADD COLUMN last_reminder_sent_at TIMESTAMP,
    ADD COLUMN reminder_count INTEGER NOT NULL DEFAULT 0;
