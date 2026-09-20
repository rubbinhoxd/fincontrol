package com.fincontrol.service;

import com.fincontrol.enums.BotSessionStatus;
import lombok.Getter;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestClient;

import java.util.Map;
import java.util.UUID;

/**
 * Cliente HTTP pra o container do bot (multi-tenant Baileys).
 * Autentica via INTERNAL_SHARED_SECRET no header. So funciona na rede docker interna.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class BotServiceClient {

    @Value("${app.bot.url}")
    private String botUrl;

    @Value("${app.bot.internal-secret}")
    private String secret;

    private RestClient client() {
        return RestClient.builder()
                .baseUrl(botUrl)
                .defaultHeader("Authorization", "Bearer " + secret)
                .build();
    }

    /** Cria (ou reinicia) sessao. Retorna estado atual — provavelmente WAITING_QR + qr string. */
    public BotSessionState createSession(UUID userId) {
        return client().post()
                .uri("/sessions/{userId}", userId)
                .retrieve()
                .body(BotSessionState.class);
    }

    /** Consulta status atual da sessao. Retorna null se sessao nao existe no bot. */
    public BotSessionState getSession(UUID userId) {
        try {
            return client().get()
                    .uri("/sessions/{userId}", userId)
                    .retrieve()
                    .body(BotSessionState.class);
        } catch (HttpClientErrorException.NotFound e) {
            return null;
        }
    }

    /** Reinicia janela de detecao de grupo (10 min novos). */
    public void restartGroupDetection(UUID userId) {
        client().post()
                .uri("/sessions/{userId}/detect-group", userId)
                .retrieve()
                .toBodilessEntity();
    }

    /** Desconecta e limpa auth_info do usuario no bot. */
    public void deleteSession(UUID userId) {
        try {
            client().delete()
                    .uri("/sessions/{userId}", userId)
                    .retrieve()
                    .toBodilessEntity();
        } catch (HttpClientErrorException.NotFound e) {
            // Ja nao existia, tudo bem.
        }
    }

    /** DTO refletindo o que o bot devolve. QR e null exceto quando status == WAITING_QR. */
    @Getter
    public static class BotSessionState {
        private BotSessionStatus status;
        private String qr;
        private String allowedJid;
        private String groupName;
    }
}
