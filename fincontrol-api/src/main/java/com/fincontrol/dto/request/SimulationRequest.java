package com.fincontrol.dto.request;

import com.fincontrol.enums.TransactionType;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

@Data
public class SimulationRequest {

    @NotNull
    private String yearMonth;

    private BigDecimal salaryOverride;

    private List<SimulatedItem> items = List.of();

    @Data
    public static class SimulatedItem {
        @NotNull
        private TransactionType type;

        @NotNull
        private BigDecimal amount;

        private UUID categoryId;

        private Boolean planned = true;
        private Boolean fixed = false;
        private Boolean recurring = false;
        private Boolean subscription = false;
        private Boolean essential = true;
        private Boolean impulse = false;
    }
}
