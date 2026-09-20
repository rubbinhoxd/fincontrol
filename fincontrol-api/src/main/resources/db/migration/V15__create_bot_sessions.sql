-- Estado da sessao WhatsApp de cada usuario (multi-tenant bot).
--
-- status:
--   DISCONNECTED   - Nunca conectou (ou desconectou)
--   WAITING_QR     - Sessao iniciada, aguardando scan do QR
--   PENDING_GROUP  - Conectou, aguardando 1a msg do proprio user num grupo
--                    (janela de 10min pra detectar JID)
--   ACTIVE         - JID capturado, bot ativo no grupo
--   GROUP_TIMEOUT  - Janela de 10min expirou sem detectar; usuario precisa
--                    "reiniciar deteccao" via botao

CREATE TABLE bot_sessions (
    user_id            UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    status             VARCHAR(20) NOT NULL DEFAULT 'DISCONNECTED',
    allowed_jid        VARCHAR(60),
    group_name         VARCHAR(200),
    detection_deadline TIMESTAMP,
    connected_at       TIMESTAMP,
    created_at         TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at         TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
