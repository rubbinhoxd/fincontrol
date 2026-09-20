package com.fincontrol.entity;

import com.fincontrol.enums.BotSessionStatus;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;
import org.springframework.data.domain.Persistable;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "bot_sessions")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BotSession implements Persistable<UUID> {

    @Id
    @Column(name = "user_id")
    private UUID userId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private BotSessionStatus status = BotSessionStatus.DISCONNECTED;

    @Column(name = "allowed_jid", length = 60)
    private String allowedJid;

    @Column(name = "group_name", length = 200)
    private String groupName;

    @Column(name = "detection_deadline")
    private LocalDateTime detectionDeadline;

    @Column(name = "connected_at")
    private LocalDateTime connectedAt;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @Override
    public UUID getId() {
        return userId;
    }

    /**
     * Necessario porque userId e atribuido manualmente (nao gerado).
     * Sem isso, Hibernate faz MERGE achando que a entidade e detached
     * e quebra com StaleObjectStateException na primeira save.
     */
    @Override
    @Transient
    public boolean isNew() {
        return createdAt == null;
    }
}
