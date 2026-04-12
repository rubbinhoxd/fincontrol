package com.fincontrol.dto.response;

import com.fincontrol.enums.TransactionType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
@AllArgsConstructor
public class TransactionResponse {
    private UUID id;
    private UUID categoryId;
    private String categoryName;
    private String categoryColor;
    private TransactionType type;
    private String description;
    private BigDecimal amount;
    private LocalDate transactionDate;
    private Boolean planned;
    private Boolean fixed;
    private Boolean recurring;
    private Boolean subscription;
    private Boolean essential;
    private Boolean impulse;
    private String notes;
    private UUID installmentGroupId;
    private Integer currentInstallment;
    private Integer totalInstallments;
    private LocalDateTime createdAt;
}
