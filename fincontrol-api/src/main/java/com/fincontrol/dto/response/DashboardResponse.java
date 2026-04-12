package com.fincontrol.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.util.List;

@Data
@Builder
@AllArgsConstructor
public class DashboardResponse {
    private String yearMonth;
    private BigDecimal salary;
    private BigDecimal totalIncome;
    private BigDecimal totalExpense;
    private BigDecimal balance;
    private BigDecimal salaryCommittedPercent;
    private BigDecimal availableToSpend;
    private BigDecimal averagePerDayRemaining;
    private int daysRemainingInMonth;
    private ExpenseBreakdown expenseBreakdown;
    private List<CategoryTotal> topCategories;
    private MonthComparison previousMonthComparison;
    private BigDecimal totalCommittedInstallments;
    private String alertLevel;

    @Data
    @Builder
    @AllArgsConstructor
    public static class ExpenseBreakdown {
        private BigDecimal fixed;
        private BigDecimal variable;
        private BigDecimal subscriptions;
        private BigDecimal unplanned;
        private BigDecimal impulse;
        private BigDecimal essential;
        private BigDecimal nonEssential;
    }

    @Data
    @Builder
    @AllArgsConstructor
    public static class CategoryTotal {
        private String categoryName;
        private BigDecimal total;
        private BigDecimal percent;
    }

    @Data
    @Builder
    @AllArgsConstructor
    public static class MonthComparison {
        private BigDecimal previousTotal;
        private BigDecimal difference;
        private BigDecimal percentChange;
    }
}
