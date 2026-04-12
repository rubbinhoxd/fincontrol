package com.fincontrol.entity;

import com.fincontrol.enums.TransactionType;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "transactions")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Transaction {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "category_id", nullable = false)
    private Category category;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private TransactionType type;

    @Column(nullable = false, length = 200)
    private String description;

    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal amount;

    @Column(name = "transaction_date", nullable = false)
    private LocalDate transactionDate;

    @Builder.Default
    @Column(nullable = false)
    private Boolean planned = true;

    @Builder.Default
    @Column(nullable = false)
    private Boolean fixed = false;

    @Builder.Default
    @Column(nullable = false)
    private Boolean recurring = false;

    @Builder.Default
    @Column(nullable = false)
    private Boolean subscription = false;

    @Builder.Default
    @Column(nullable = false)
    private Boolean essential = true;

    @Builder.Default
    @Column(nullable = false)
    private Boolean impulse = false;

    private String notes;

    @Column(name = "installment_group_id")
    private UUID installmentGroupId;

    @Column(name = "current_installment")
    private Integer currentInstallment;

    @Column(name = "total_installments")
    private Integer totalInstallments;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @PrePersist
    @PreUpdate
    private void enforceBusinessRules() {
        if (Boolean.TRUE.equals(subscription)) {
            this.recurring = true;
        }
        if (Boolean.TRUE.equals(impulse)) {
            this.planned = false;
        }
    }
}
