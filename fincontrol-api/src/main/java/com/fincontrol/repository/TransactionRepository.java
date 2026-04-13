package com.fincontrol.repository;

import com.fincontrol.entity.Transaction;
import com.fincontrol.enums.TransactionType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public interface TransactionRepository extends JpaRepository<Transaction, UUID> {

    @Query("SELECT t FROM Transaction t JOIN FETCH t.category " +
           "WHERE t.user.id = :userId AND t.transactionDate BETWEEN :startDate AND :endDate " +
           "ORDER BY t.transactionDate DESC")
    List<Transaction> findByUserAndDateRange(UUID userId, LocalDate startDate, LocalDate endDate);

    @Query("SELECT t FROM Transaction t JOIN FETCH t.category " +
           "WHERE t.user.id = :userId AND t.type = :type " +
           "AND t.transactionDate BETWEEN :startDate AND :endDate " +
           "ORDER BY t.transactionDate DESC")
    List<Transaction> findByUserAndTypeAndDateRange(UUID userId, TransactionType type,
                                                     LocalDate startDate, LocalDate endDate);

    @Query("SELECT t FROM Transaction t JOIN FETCH t.category " +
           "WHERE t.user.id = :userId AND t.category.id = :categoryId " +
           "AND t.transactionDate BETWEEN :startDate AND :endDate " +
           "ORDER BY t.transactionDate DESC")
    List<Transaction> findByUserAndCategoryAndDateRange(UUID userId, UUID categoryId,
                                                         LocalDate startDate, LocalDate endDate);

    @Query("SELECT COALESCE(SUM(t.amount), 0) FROM Transaction t " +
           "WHERE t.user.id = :userId AND t.type = :type " +
           "AND t.transactionDate BETWEEN :startDate AND :endDate")
    BigDecimal sumByUserIdAndTypeAndDateRange(UUID userId, TransactionType type,
                                              LocalDate startDate, LocalDate endDate);

    @Query("SELECT COALESCE(SUM(t.amount), 0) FROM Transaction t " +
           "WHERE t.user.id = :userId AND t.type = 'EXPENSE' " +
           "AND t.fixed = true " +
           "AND t.transactionDate BETWEEN :startDate AND :endDate")
    BigDecimal sumFixedExpenses(UUID userId, LocalDate startDate, LocalDate endDate);

    @Query("SELECT COALESCE(SUM(t.amount), 0) FROM Transaction t " +
           "WHERE t.user.id = :userId AND t.type = 'EXPENSE' " +
           "AND t.subscription = true " +
           "AND t.transactionDate BETWEEN :startDate AND :endDate")
    BigDecimal sumSubscriptionExpenses(UUID userId, LocalDate startDate, LocalDate endDate);

    @Query("SELECT COALESCE(SUM(t.amount), 0) FROM Transaction t " +
           "WHERE t.user.id = :userId AND t.type = 'EXPENSE' " +
           "AND t.planned = false " +
           "AND t.transactionDate BETWEEN :startDate AND :endDate")
    BigDecimal sumUnplannedExpenses(UUID userId, LocalDate startDate, LocalDate endDate);

    @Query("SELECT COALESCE(SUM(t.amount), 0) FROM Transaction t " +
           "WHERE t.user.id = :userId AND t.type = 'EXPENSE' " +
           "AND t.impulse = true " +
           "AND t.transactionDate BETWEEN :startDate AND :endDate")
    BigDecimal sumImpulseExpenses(UUID userId, LocalDate startDate, LocalDate endDate);

    @Query("SELECT COALESCE(SUM(t.amount), 0) FROM Transaction t " +
           "WHERE t.user.id = :userId AND t.type = 'EXPENSE' " +
           "AND t.essential = true " +
           "AND t.transactionDate BETWEEN :startDate AND :endDate")
    BigDecimal sumEssentialExpenses(UUID userId, LocalDate startDate, LocalDate endDate);

    @Query("SELECT t.category.name, t.category.color, SUM(t.amount) FROM Transaction t " +
           "WHERE t.user.id = :userId AND t.type = 'EXPENSE' " +
           "AND t.transactionDate BETWEEN :startDate AND :endDate " +
           "GROUP BY t.category.name, t.category.color ORDER BY SUM(t.amount) DESC")
    List<Object[]> findTopExpenseCategories(UUID userId, LocalDate startDate, LocalDate endDate);

    @Query("SELECT t FROM Transaction t WHERE t.installmentGroupId = :groupId " +
           "AND t.currentInstallment > :currentInstallment")
    List<Transaction> findFutureInstallments(UUID groupId, Integer currentInstallment);

    @Query("SELECT COALESCE(SUM(t.amount), 0) FROM Transaction t " +
           "WHERE t.user.id = :userId AND t.type = 'EXPENSE' " +
           "AND t.installmentGroupId IS NOT NULL " +
           "AND t.transactionDate >= :fromDate")
    BigDecimal sumInstallmentExpenses(UUID userId, LocalDate fromDate);

    @Query("SELECT t FROM Transaction t WHERE t.recurringGroupId = :groupId " +
           "AND t.transactionDate > :afterDate")
    List<Transaction> findFutureRecurring(UUID groupId, LocalDate afterDate);

    @Query("SELECT t FROM Transaction t WHERE t.recurringGroupId = :groupId " +
           "AND t.transactionDate >= :fromDate")
    List<Transaction> findRecurringFromDate(UUID groupId, LocalDate fromDate);
}
