package com.fincontrol.exception;

import com.fincontrol.dto.response.TransactionResponse;
import lombok.Getter;

/**
 * Lancada quando ao criar uma transacao, o sistema encontra outra do mesmo
 * dia e mesmo valor com descricao parecida. Segurada no controller pra
 * retornar 409 com o payload da duplicata (bot/frontend pergunta ao usuario).
 */
@Getter
public class DuplicateTransactionException extends RuntimeException {
    private final TransactionResponse existing;

    public DuplicateTransactionException(TransactionResponse existing) {
        super("Transacao parecida ja cadastrada no mesmo dia");
        this.existing = existing;
    }
}
