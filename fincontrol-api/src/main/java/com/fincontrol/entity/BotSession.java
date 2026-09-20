package com.fincontrol.entity;

import com.fincontrol.enums.BotSessionStatus;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "bot_sessions")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BotSession {

    @Id
    @Column(name = "user_id")
    private UUID userId;

    @OneToOne(fetch = FetchType.LAZY)
    @MapsId
    @JoinColumn(name = "user_id")
    private User user;

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
}
