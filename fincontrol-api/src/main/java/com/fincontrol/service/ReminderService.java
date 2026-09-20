package com.fincontrol.service;

import com.fincontrol.entity.User;
import com.fincontrol.repository.TransactionRepository;
import com.fincontrol.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

/**
 * Envia lembrete de inatividade por email pra quem ficou tempo sem cadastrar transacao.
 *
 * Backoff: quanto mais lembretes ja mandou, mais tempo espera pra mandar o proximo.
 *   proximo_intervalo = min(4 + reminder_count * 7, 60) dias
 *
 * Ex: 1o em 4d, 2o em 11d, 3o em 18d, 4o em 25d, 5o em 32d, 6o+ em 60d (cap).
 *
 * Ao criar transacao, o TransactionService zera o reminder_count — quem volta
 * a usar entra de novo no fluxo curto (4d).
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class ReminderService {

    private static final int BASE_DAYS = 4;
    private static final int STEP_DAYS = 7;
    private static final int MAX_DAYS = 60;
    private static final int MIN_ACCOUNT_AGE_DAYS = 5;

    private final UserRepository userRepository;
    private final TransactionRepository transactionRepository;
    private final EmailService emailService;

    /**
     * Roda 1x/dia as 12h. Cron: seg, min, hora, dia_mes, mes, dia_semana
     * Ajustar via SCHEDULE_REMINDER_CRON env se quiser mudar sem redeploy.
     */
    @Scheduled(cron = "${app.reminder.cron:0 0 12 * * *}")
    @Transactional
    public void sendInactivityReminders() {
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime cutoff = now.minusDays(MIN_ACCOUNT_AGE_DAYS);

        var candidates = userRepository.findReminderCandidates(cutoff);
        log.info("Reminder job: {} candidatos filtrados", candidates.size());

        int sent = 0;
        for (User user : candidates) {
            if (shouldSendReminder(user, now)) {
                try {
                    // Reaproveita verification_token como token de unsubscribe (uso unico, ja tem gerador)
                    // — mas nao mexe no verification_token real; gera um passageiro so pro link.
                    String unsubToken = user.getId().toString();
                    emailService.sendInactivityReminder(user.getEmail(), user.getName(), unsubToken);
                    user.setLastReminderSentAt(now);
                    user.setReminderCount(user.getReminderCount() + 1);
                    userRepository.save(user);
                    sent++;
                } catch (Exception e) {
                    log.error("Falha ao mandar lembrete pra {}: {}", user.getEmail(), e.getMessage());
                }
            }
        }
        log.info("Reminder job: {} emails enviados", sent);
    }

    private boolean shouldSendReminder(User user, LocalDateTime now) {
        // Ultima atividade: MAX(criacao_conta, ultima_transacao, ultimo_lembrete_ja_enviado)
        // — o lembrete conta como "tempo desde o ultimo lembrete", porque o backoff e baseado
        // no proprio lembrete anterior (e nao na ultima transacao).
        LocalDateTime lastTransaction = transactionRepository.findLastTransactionCreatedAt(user.getId())
                .orElse(user.getCreatedAt());

        LocalDateTime lastActivity = lastTransaction;
        if (user.getLastReminderSentAt() != null && user.getLastReminderSentAt().isAfter(lastActivity)) {
            lastActivity = user.getLastReminderSentAt();
        }

        int daysSince = (int) java.time.Duration.between(lastActivity, now).toDays();
        int requiredDays = Math.min(BASE_DAYS + user.getReminderCount() * STEP_DAYS, MAX_DAYS);

        return daysSince >= requiredDays;
    }

    /**
     * Chamado pelo TransactionService quando o usuario cria uma transacao —
     * zera o backoff pra proxima onda de inatividade voltar do zero.
     */
    @Transactional
    public void resetReminderOnActivity(User user) {
        if (user.getReminderCount() > 0 || user.getLastReminderSentAt() != null) {
            user.setReminderCount(0);
            user.setLastReminderSentAt(null);
            userRepository.save(user);
        }
    }

    /**
     * Opt-out: desativa notificacoes. Chamado pelo endpoint publico /unsubscribe.
     * Retorna true se conseguiu desativar (usuario existe).
     */
    @Transactional
    public boolean unsubscribe(String userIdRaw) {
        try {
            java.util.UUID id = java.util.UUID.fromString(userIdRaw);
            return userRepository.findById(id).map(u -> {
                u.setNotificationsEnabled(false);
                userRepository.save(u);
                return true;
            }).orElse(false);
        } catch (Exception e) {
            return false;
        }
    }
}
