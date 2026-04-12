package com.fincontrol.service;

import com.fincontrol.dto.request.TransactionRequest;
import com.fincontrol.dto.response.TransactionResponse;
import com.fincontrol.entity.Category;
import com.fincontrol.entity.Transaction;
import com.fincontrol.entity.User;
import com.fincontrol.enums.TransactionType;
import com.fincontrol.exception.ResourceNotFoundException;
import com.fincontrol.repository.CategoryRepository;
import com.fincontrol.repository.TransactionRepository;
import com.fincontrol.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.YearMonth;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class TransactionService {

    private final TransactionRepository transactionRepository;
    private final CategoryRepository categoryRepository;
    private final UserRepository userRepository;

    @Transactional(readOnly = true)
    public List<TransactionResponse> findByMonth(UUID userId, String yearMonth,
                                                  TransactionType type, UUID categoryId) {
        YearMonth ym = YearMonth.parse(yearMonth);
        LocalDate startDate = ym.atDay(1);
        LocalDate endDate = ym.atEndOfMonth();

        List<Transaction> transactions;

        if (categoryId != null) {
            transactions = transactionRepository
                    .findByUserAndCategoryAndDateRange(userId, categoryId, startDate, endDate);
        } else if (type != null) {
            transactions = transactionRepository
                    .findByUserAndTypeAndDateRange(userId, type, startDate, endDate);
        } else {
            transactions = transactionRepository
                    .findByUserAndDateRange(userId, startDate, endDate);
        }

        return transactions.stream().map(this::toResponse).toList();
    }

    @Transactional(readOnly = true)
    public TransactionResponse findById(UUID userId, UUID transactionId) {
        Transaction transaction = transactionRepository.findById(transactionId)
                .filter(t -> t.getUser().getId().equals(userId))
                .orElseThrow(() -> new ResourceNotFoundException("Transaction", transactionId));
        return toResponse(transaction);
    }

    @Transactional
    public TransactionResponse create(UUID userId, TransactionRequest request) {
        User user = userRepository.getReferenceById(userId);
        Category category = categoryRepository.findById(request.getCategoryId())
                .filter(c -> c.getUser().getId().equals(userId))
                .orElseThrow(() -> new ResourceNotFoundException("Category", request.getCategoryId()));

        Transaction transaction = Transaction.builder()
                .user(user)
                .category(category)
                .type(request.getType())
                .description(request.getDescription())
                .amount(request.getAmount())
                .transactionDate(request.getTransactionDate())
                .planned(request.getPlanned())
                .fixed(request.getFixed())
                .recurring(request.getRecurring())
                .subscription(request.getSubscription())
                .essential(request.getEssential())
                .impulse(request.getImpulse())
                .notes(request.getNotes())
                .build();

        if (Boolean.TRUE.equals(request.getInstallment())) {
            validateInstallmentFields(request);
            UUID groupId = UUID.randomUUID();

            transaction.setInstallmentGroupId(groupId);
            transaction.setCurrentInstallment(request.getCurrentInstallment());
            transaction.setTotalInstallments(request.getTotalInstallments());

            transaction = transactionRepository.save(transaction);

            createFutureInstallments(transaction, user, category, groupId);
        } else {
            transaction = transactionRepository.save(transaction);
        }

        return toResponse(transaction);
    }

    @Transactional
    public TransactionResponse update(UUID userId, UUID transactionId, TransactionRequest request) {
        Transaction transaction = transactionRepository.findById(transactionId)
                .filter(t -> t.getUser().getId().equals(userId))
                .orElseThrow(() -> new ResourceNotFoundException("Transaction", transactionId));

        Category category = categoryRepository.findById(request.getCategoryId())
                .filter(c -> c.getUser().getId().equals(userId))
                .orElseThrow(() -> new ResourceNotFoundException("Category", request.getCategoryId()));

        transaction.setCategory(category);
        transaction.setType(request.getType());
        transaction.setDescription(request.getDescription());
        transaction.setAmount(request.getAmount());
        transaction.setTransactionDate(request.getTransactionDate());
        transaction.setPlanned(request.getPlanned());
        transaction.setFixed(request.getFixed());
        transaction.setRecurring(request.getRecurring());
        transaction.setSubscription(request.getSubscription());
        transaction.setEssential(request.getEssential());
        transaction.setImpulse(request.getImpulse());
        transaction.setNotes(request.getNotes());
        // installmentGroupId, currentInstallment, totalInstallments nao sao alteraveis

        return toResponse(transactionRepository.save(transaction));
    }

    @Transactional
    public void delete(UUID userId, UUID transactionId) {
        Transaction transaction = transactionRepository.findById(transactionId)
                .filter(t -> t.getUser().getId().equals(userId))
                .orElseThrow(() -> new ResourceNotFoundException("Transaction", transactionId));

        if (transaction.getInstallmentGroupId() != null) {
            List<Transaction> futureInstallments = transactionRepository.findFutureInstallments(
                    transaction.getInstallmentGroupId(), transaction.getCurrentInstallment());
            transactionRepository.deleteAll(futureInstallments);
        }

        transactionRepository.delete(transaction);
    }

    private void validateInstallmentFields(TransactionRequest request) {
        if (request.getCurrentInstallment() == null || request.getTotalInstallments() == null) {
            throw new IllegalArgumentException("currentInstallment and totalInstallments are required for installments");
        }
        if (request.getCurrentInstallment() < 1) {
            throw new IllegalArgumentException("currentInstallment must be >= 1");
        }
        if (request.getTotalInstallments() < 2) {
            throw new IllegalArgumentException("totalInstallments must be >= 2");
        }
        if (request.getCurrentInstallment() > request.getTotalInstallments()) {
            throw new IllegalArgumentException("currentInstallment cannot be greater than totalInstallments");
        }
    }

    private void createFutureInstallments(Transaction original, User user, Category category, UUID groupId) {
        int current = original.getCurrentInstallment();
        int total = original.getTotalInstallments();

        if (current >= total) {
            return;
        }

        List<Transaction> futureInstallments = new ArrayList<>();

        for (int i = current + 1; i <= total; i++) {
            int monthsAhead = i - current;
            Transaction installment = Transaction.builder()
                    .user(user)
                    .category(category)
                    .type(original.getType())
                    .description(original.getDescription())
                    .amount(original.getAmount())
                    .transactionDate(original.getTransactionDate().plusMonths(monthsAhead))
                    .planned(false)
                    .fixed(true)
                    .recurring(false)
                    .subscription(false)
                    .essential(original.getEssential())
                    .impulse(false)
                    .notes(original.getNotes())
                    .installmentGroupId(groupId)
                    .currentInstallment(i)
                    .totalInstallments(total)
                    .build();
            futureInstallments.add(installment);
        }

        transactionRepository.saveAll(futureInstallments);
    }

    private TransactionResponse toResponse(Transaction t) {
        return TransactionResponse.builder()
                .id(t.getId())
                .categoryId(t.getCategory().getId())
                .categoryName(t.getCategory().getName())
                .categoryColor(t.getCategory().getColor())
                .type(t.getType())
                .description(t.getDescription())
                .amount(t.getAmount())
                .transactionDate(t.getTransactionDate())
                .planned(t.getPlanned())
                .fixed(t.getFixed())
                .recurring(t.getRecurring())
                .subscription(t.getSubscription())
                .essential(t.getEssential())
                .impulse(t.getImpulse())
                .notes(t.getNotes())
                .installmentGroupId(t.getInstallmentGroupId())
                .currentInstallment(t.getCurrentInstallment())
                .totalInstallments(t.getTotalInstallments())
                .createdAt(t.getCreatedAt())
                .build();
    }
}
