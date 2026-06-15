package com.fincontrol.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

@Data
@Builder
@AllArgsConstructor
public class CardCycleResponse {
    private UUID id;
    private String name;
    private String color;
    private String brand;
    private Integer closingDay;
    private Integer dueDay;
    private BigDecimal creditLimit;
    private Boolean shared;
    private LocalDate cycleStart;
    private LocalDate cycleEnd;
    private BigDecimal totalSpent;
    private BigDecimal myShare;
    private BigDecimal percentOfLimit;
    private BigDecimal percentOfSalary;
    private int daysUntilClosing;
    private int transactionCount;
    private boolean closed;
}
