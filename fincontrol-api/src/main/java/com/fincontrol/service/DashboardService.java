package com.fincontrol.service;

import com.fincontrol.dto.response.DashboardResponse;
import com.fincontrol.dto.response.MonthlyReferenceResponse;
import com.fincontrol.enums.TransactionType;
import com.fincontrol.repository.TransactionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.*;;

@Service
@RequiredArgsConstructor
public class DashboardService {

    private final TransactionRepository transactionRepository;
    private final MonthlyReferenceService monthlyReferenceService;

    public DashboardResponse getDashboard(UUID userId, String yearMonth) {
        YearMonth ym = YearMonth.parse(yearMonth);
        LocalDate startDate = ym.atDay(1);
        LocalDate endDate = ym.atEndOfMonth();

        MonthlyReferenceResponse ref = monthlyReferenceService.getEffectiveReference(userId, yearMonth);
        BigDecimal salary = ref != null ? ref.getSalary() : BigDecimal.ZERO;

        BigDecimal totalIncome = transactionRepository.sumByUserIdAndTypeAndDateRange(
                userId, TransactionType.INCOME, startDate, endDate);
        BigDecimal totalExpense = transactionRepository.sumByUserIdAndTypeAndDateRange(
                userId, TransactionType.EXPENSE, startDate, endDate);
        BigDecimal balance = totalIncome.subtract(totalExpense);

        BigDecimal salaryCommittedPercent = BigDecimal.ZERO;
        BigDecimal availableToSpend = salary.subtract(totalExpense);
        if (salary.compareTo(BigDecimal.ZERO) > 0) {
            salaryCommittedPercent = totalExpense
                    .multiply(BigDecimal.valueOf(100))
                    .divide(salary, 2, RoundingMode.HALF_UP);
        }

        int daysRemaining = calculateDaysRemaining(ym);
        BigDecimal averagePerDay = BigDecimal.ZERO;
        if (daysRemaining > 0 && availableToSpend.compareTo(BigDecimal.ZERO) > 0) {
            averagePerDay = availableToSpend.divide(
                    BigDecimal.valueOf(daysRemaining), 2, RoundingMode.HALF_UP);
        }

        BigDecimal fixedExpenses = transactionRepository.sumFixedExpenses(userId, startDate, endDate);
        BigDecimal subscriptionExpenses = transactionRepository.sumSubscriptionExpenses(userId, startDate, endDate);
        BigDecimal unplannedExpenses = transactionRepository.sumUnplannedExpenses(userId, startDate, endDate);
        BigDecimal impulseExpenses = transactionRepository.sumImpulseExpenses(userId, startDate, endDate);
        BigDecimal essentialExpenses = transactionRepository.sumEssentialExpenses(userId, startDate, endDate);
        BigDecimal variableExpenses = totalExpense.subtract(fixedExpenses);
        BigDecimal nonEssentialExpenses = totalExpense.subtract(essentialExpenses);

        List<Object[]> topCategoriesRaw = transactionRepository.findTopExpenseCategories(
                userId, startDate, endDate);
        List<DashboardResponse.CategoryTotal> topCategories = topCategoriesRaw.stream()
                .limit(5)
                .map(row -> {
                    String catName = (String) row[0];
                    BigDecimal catTotal = (BigDecimal) row[1];
                    BigDecimal percent = totalExpense.compareTo(BigDecimal.ZERO) > 0
                            ? catTotal.multiply(BigDecimal.valueOf(100))
                                .divide(totalExpense, 2, RoundingMode.HALF_UP)
                            : BigDecimal.ZERO;
                    return DashboardResponse.CategoryTotal.builder()
                            .categoryName(catName)
                            .total(catTotal)
                            .percent(percent)
                            .build();
                })
                .toList();

        BigDecimal totalCommittedInstallments = transactionRepository.sumInstallmentExpenses(
                userId, startDate);

        DashboardResponse.MonthComparison comparison = buildMonthComparison(userId, ym, totalExpense);

        String alertLevel = determineAlertLevel(salaryCommittedPercent);

        return DashboardResponse.builder()
                .yearMonth(yearMonth)
                .salary(salary)
                .totalIncome(totalIncome)
                .totalExpense(totalExpense)
                .balance(balance)
                .salaryCommittedPercent(salaryCommittedPercent)
                .availableToSpend(availableToSpend)
                .averagePerDayRemaining(averagePerDay)
                .daysRemainingInMonth(daysRemaining)
                .expenseBreakdown(DashboardResponse.ExpenseBreakdown.builder()
                        .fixed(fixedExpenses)
                        .variable(variableExpenses)
                        .subscriptions(subscriptionExpenses)
                        .unplanned(unplannedExpenses)
                        .impulse(impulseExpenses)
                        .essential(essentialExpenses)
                        .nonEssential(nonEssentialExpenses)
                        .build())
                .topCategories(topCategories)
                .totalCommittedInstallments(totalCommittedInstallments)
                .previousMonthComparison(comparison)
                .alertLevel(alertLevel)
                .build();
    }

    private int calculateDaysRemaining(YearMonth ym) {
        LocalDate today = LocalDate.now();
        LocalDate endOfMonth = ym.atEndOfMonth();

        if (today.isAfter(endOfMonth)) {
            return 0;
        }
        if (today.isBefore(ym.atDay(1))) {
            return ym.lengthOfMonth();
        }
        return endOfMonth.getDayOfMonth() - today.getDayOfMonth();
    }

    private DashboardResponse.MonthComparison buildMonthComparison(UUID userId, YearMonth currentMonth,
                                                                    BigDecimal currentTotal) {
        YearMonth previousMonth = currentMonth.minusMonths(1);
        LocalDate prevStart = previousMonth.atDay(1);
        LocalDate prevEnd = previousMonth.atEndOfMonth();

        BigDecimal previousTotal = transactionRepository.sumByUserIdAndTypeAndDateRange(
                userId, TransactionType.EXPENSE, prevStart, prevEnd);

        BigDecimal difference = currentTotal.subtract(previousTotal);
        BigDecimal percentChange = BigDecimal.ZERO;
        if (previousTotal.compareTo(BigDecimal.ZERO) > 0) {
            percentChange = difference
                    .multiply(BigDecimal.valueOf(100))
                    .divide(previousTotal, 2, RoundingMode.HALF_UP);
        }

        return DashboardResponse.MonthComparison.builder()
                .previousTotal(previousTotal)
                .difference(difference)
                .percentChange(percentChange)
                .build();
    }

    public List<Map<String, Object>> getYearlySummary(UUID userId, int year) {
        List<Map<String, Object>> result = new ArrayList<>();
        for (int month = 1; month <= 12; month++) {
            YearMonth ym = YearMonth.of(year, month);
            LocalDate start = ym.atDay(1);
            LocalDate end = ym.atEndOfMonth();

            BigDecimal income = transactionRepository.sumByUserIdAndTypeAndDateRange(
                    userId, TransactionType.INCOME, start, end);
            BigDecimal expense = transactionRepository.sumByUserIdAndTypeAndDateRange(
                    userId, TransactionType.EXPENSE, start, end);

            Map<String, Object> entry = new LinkedHashMap<>();
            entry.put("month", String.format("%d-%02d", year, month));
            entry.put("income", income);
            entry.put("expense", expense);
            result.add(entry);
        }
        return result;
    }

    private String determineAlertLevel(BigDecimal percentCommitted) {
        if (percentCommitted.compareTo(BigDecimal.valueOf(90)) >= 0) {
            return "RED";
        } else if (percentCommitted.compareTo(BigDecimal.valueOf(70)) >= 0) {
            return "YELLOW";
        }
        return "GREEN";
    }
}
