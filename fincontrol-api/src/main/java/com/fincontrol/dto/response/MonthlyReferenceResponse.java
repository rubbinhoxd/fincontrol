package com.fincontrol.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.util.UUID;

@Data
@Builder
@AllArgsConstructor
public class MonthlyReferenceResponse {
    private UUID id;
    private String yearMonth;
    private BigDecimal salary;
    private String notes;
}
