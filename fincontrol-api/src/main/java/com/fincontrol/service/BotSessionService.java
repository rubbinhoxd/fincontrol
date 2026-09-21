package com.fincontrol.service;

import com.fincontrol.entity.BotSession;
import com.fincontrol.enums.BotSessionStatus;
import com.fincontrol.repository.BotSessionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Orquestra o estado da sessao WhatsApp de um usuario: persiste em bot_sessions
 * e sincroniza com o container do bot via BotServiceClient.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class BotSessionService {

    private final BotSessionRepository botSessionRepository;
    private final BotServiceClient botClient;

    /**
     * Inicia (ou reinicia) o processo de conexao. Retorna o estado atual (com QR
     * se WAITING_QR).
     */
    @Transactional
    public SessionSnapshot connect(UUID userId) {
        BotSession session = botSessionRepository.findById(userId)
                .orElseGet(() -> BotSession.builder().userId(userId).build());

        session.setStatus(BotSessionStatus.WAITING_QR);
        session.setAllowedJid(null);
        session.setGroupName(null);
        session.setConnectedAt(null);
        botSessionRepository.save(session);

        BotServiceClient.BotSessionState state = botClient.createSession(userId);
        return SessionSnapshot.from(session, state);
    }

    /**
     * Le status atual: pergunta pro bot (fonte da verdade sobre QR e connection),
     * atualiza o banco se mudou, retorna snapshot combinado.
     */
    @Transactional
    public SessionSnapshot getStatus(UUID userId) {
        BotSession session = botSessionRepository.findById(userId).orElse(null);
        if (session == null) {
            return SessionSnapshot.disconnected();
        }

        BotServiceClient.BotSessionState state = botClient.getSession(userId);
        if (state == null) {
            // Bot nao tem sessao ativa (talvez container reiniciou e ainda nao recarregou)
            return SessionSnapshot.from(session, null);
        }

        // Reflete mudancas do bot no banco (JID capturado, mudou pra CONNECTED, etc)
        boolean changed = false;
        if (state.getStatus() != null && state.getStatus() != session.getStatus()) {
            session.setStatus(state.getStatus());
            changed = true;
        }
        // Bot voltou pra DISCONNECTED (loggedOut, wipe, etc) — limpa dados de conexao
        if (state.getStatus() == BotSessionStatus.DISCONNECTED
                && (session.getAllowedJid() != null || session.getGroupName() != null || session.getConnectedAt() != null)) {
            session.setAllowedJid(null);
            session.setGroupName(null);
            session.setConnectedAt(null);
            changed = true;
        } else if (state.getAllowedJid() != null && !state.getAllowedJid().equals(session.getAllowedJid())) {
            session.setAllowedJid(state.getAllowedJid());
            session.setGroupName(state.getGroupName());
            session.setConnectedAt(LocalDateTime.now());
            changed = true;
        } else if (state.getGroupName() != null && !state.getGroupName().equals(session.getGroupName())) {
            // JID ja salvo mas group_name mudou/estava vazio — atualiza sozinho
            session.setGroupName(state.getGroupName());
            changed = true;
        }
        if (changed) {
            botSessionRepository.save(session);
        }

        return SessionSnapshot.from(session, state);
    }

    @Transactional
    public void restartGroupDetection(UUID userId) {
        BotSession session = botSessionRepository.findById(userId)
                .orElseThrow(() -> new IllegalStateException("Sessao nao existe"));
        botClient.restartGroupDetection(userId);
        session.setStatus(BotSessionStatus.PENDING_GROUP);
        session.setDetectionDeadline(LocalDateTime.now().plusMinutes(10));
        botSessionRepository.save(session);
    }

    @Transactional
    public void disconnect(UUID userId) {
        botClient.deleteSession(userId);
        botSessionRepository.findById(userId).ifPresent(s -> {
            s.setStatus(BotSessionStatus.DISCONNECTED);
            s.setAllowedJid(null);
            s.setGroupName(null);
            s.setConnectedAt(null);
            s.setDetectionDeadline(null);
            botSessionRepository.save(s);
        });
    }

    /** Snapshot combinado banco+bot pra devolver pro frontend. */
    public record SessionSnapshot(
            BotSessionStatus status,
            String qr,
            String allowedJid,
            String groupName
    ) {
        public static SessionSnapshot disconnected() {
            return new SessionSnapshot(BotSessionStatus.DISCONNECTED, null, null, null);
        }

        public static SessionSnapshot from(BotSession session, BotServiceClient.BotSessionState state) {
            String qr = state != null ? state.getQr() : null;
            BotSessionStatus status = state != null && state.getStatus() != null
                    ? state.getStatus()
                    : session.getStatus();
            return new SessionSnapshot(status, qr, session.getAllowedJid(), session.getGroupName());
        }
    }
}
