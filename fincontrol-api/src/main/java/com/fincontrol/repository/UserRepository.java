package com.fincontrol.repository;

import com.fincontrol.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface UserRepository extends JpaRepository<User, UUID> {

    Optional<User> findByEmail(String email);

    boolean existsByEmail(String email);

    Optional<User> findByVerificationToken(String token);

    Optional<User> findByPasswordResetToken(String token);

    /**
     * Candidatos a receber lembrete de inatividade:
     * - Email verificado
     * - Notificacoes habilitadas
     * - Conta com pelo menos 5 dias de existencia (nao pega recem-criados)
     * - Ultima transacao (ou criacao da conta, se nunca fez) foi ha muito tempo
     * O calculo do "muito tempo" (com backoff) e feito em Java, aqui filtramos so o basico.
     */
    @Query("""
        SELECT u FROM User u
        WHERE u.emailVerified = true
          AND u.notificationsEnabled = true
          AND u.createdAt < :fiveDaysAgo
    """)
    List<User> findReminderCandidates(LocalDateTime fiveDaysAgo);
}
