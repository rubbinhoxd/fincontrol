package com.fincontrol.dto.request;

import com.fincontrol.enums.TransactionType;
import jakarta.validation.constraints.*;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

@Data
public class TransactionRequest {

    @NotNull
    private UUID categoryId;

    @NotNull
    private TransactionType type;

    @NotBlank
    @Size(max = 200)
    private String description;

    @NotNull
    @DecimalMin(value = "0.01")
    private BigDecimal amount;

    @NotNull
    private LocalDate transactionDate;

    private Boolean planned = true;
    private Boolean fixed = false;
    private Boolean recurring = false;
    private Boolean subscription = false;
    private Boolean essential = true;
    private Boolean impulse = false;
    private String notes;

    private Boolean installment = false;

    @Min(1)
    private Integer currentInstallment;

    @Min(2)
    private Integer totalInstallments;
}
