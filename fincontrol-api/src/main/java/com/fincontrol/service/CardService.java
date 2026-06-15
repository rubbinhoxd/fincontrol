package com.fincontrol.service;

import com.fincontrol.dto.request.CardRequest;
import com.fincontrol.dto.response.CardCycleDetailResponse;
import com.fincontrol.dto.response.CardCycleResponse;
import com.fincontrol.dto.response.CardResponse;
import com.fincontrol.dto.response.MonthlyReferenceResponse;
import com.fincontrol.dto.response.TransactionResponse;
import com.fincontrol.entity.Card;
import com.fincontrol.entity.Transaction;
import com.fincontrol.entity.User;
import com.fincontrol.exception.ResourceNotFoundException;
import com.fincontrol.repository.CardRepository;
import com.fincontrol.repository.TransactionRepository;
import com.fincontrol.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class CardService {

    private final CardRepository cardRepository;
    private final TransactionRepository transactionRepository;
    private final UserRepository userRepository;
    private final MonthlyReferenceService monthlyReferenceService;

    @Transactional(readOnly = true)
    public List<CardResponse> findAll(UUID userId) {
        return cardRepository.findByUserIdAndActiveTrueOrderByName(userId)
                .stream().map(this::toResponse).toList();
    }

    @Transactional
    public CardResponse create(UUID userId, CardRequest request) {
        User user = userRepository.getReferenceById(userId);
        Card card = Card.builder()
                .user(user)
                .name(request.getName())
                .color(request.getColor())
                .brand(request.getBrand())
                .closingDay(request.getClosingDay())
                .dueDay(request.getDueDay())
                .creditLimit(request.getCreditLimit())
                .build();
        return toResponse(cardRepository.save(card));
    }

    @Transactional
    public CardResponse update(UUID userId, UUID cardId, CardRequest request) {
        Card card = cardRepository.findByIdAndUserId(cardId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Card", cardId));

        card.setName(request.getName());
        card.setColor(request.getColor());
        card.setBrand(request.getBrand());
        card.setClosingDay(request.getClosingDay());
        card.setDueDay(request.getDueDay());
        card.setCreditLimit(request.getCreditLimit());

        return toResponse(cardRepository.save(card));
    }

    @Transactional
    public void delete(UUID userId, UUID cardId) {
        Card card = cardRepository.findByIdAndUserId(cardId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Card", cardId));
        card.setActive(false);
        cardRepository.save(card);
    }

    @Transactional(readOnly = true)
    public List<CardCycleResponse> getAllCycles(UUID userId) {
        LocalDate today = LocalDate.now();
        BigDecimal salary = currentSalary(userId);
        return cardRepository.findByUserIdAndActiveTrueOrderByName(userId).stream()
                .map(c -> buildCycle(c, today, salary))
                .toList();
    }

    @Transactional(readOnly = true)
    public CardCycleDetailResponse getCycleDetail(UUID userId, UUID cardId, LocalDate referenceDate) {
        Card card = cardRepository.findByIdAndUserId(cardId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Card", cardId));

        LocalDate ref = referenceDate != null ? referenceDate : LocalDate.now();
        BigDecimal salary = currentSalary(userId);
        CardCycleResponse cycle = buildCycle(card, ref, salary);

        List<Transaction> txs = transactionRepository.findByCardAndDateRange(
                cardId, cycle.getCycleStart(), cycle.getCycleEnd());
        List<TransactionResponse> txResponses = txs.stream()
                .map(this::transactionToResponse)
                .toList();

        return CardCycleDetailResponse.builder()
                .cycle(cycle)
                .transactions(txResponses)
                .build();
    }

    private BigDecimal currentSalary(UUID userId) {
        String yearMonth = YearMonth.now().toString();
        MonthlyReferenceResponse ref = monthlyReferenceService.getEffectiveReference(userId, yearMonth);
        return ref != null ? ref.getSalary() : BigDecimal.ZERO;
    }

    private CardCycleResponse buildCycle(Card card, LocalDate today, BigDecimal salary) {
        LocalDate[] window = currentCycle(today, card.getClosingDay());
        LocalDate cycleStart = window[0];
        LocalDate cycleEnd = window[1];

        BigDecimal totalSpent = transactionRepository.sumByCardAndDateRange(
                card.getId(), cycleStart, cycleEnd);
        long count = transactionRepository.countByCardAndDateRange(
                card.getId(), cycleStart, cycleEnd);

        BigDecimal percentOfLimit = BigDecimal.ZERO;
        if (card.getCreditLimit() != null && card.getCreditLimit().compareTo(BigDecimal.ZERO) > 0) {
            percentOfLimit = totalSpent.multiply(BigDecimal.valueOf(100))
                    .divide(card.getCreditLimit(), 2, RoundingMode.HALF_UP);
        }

        BigDecimal percentOfSalary = BigDecimal.ZERO;
        if (salary.compareTo(BigDecimal.ZERO) > 0) {
            percentOfSalary = totalSpent.multiply(BigDecimal.valueOf(100))
                    .divide(salary, 2, RoundingMode.HALF_UP);
        }

        LocalDate now = LocalDate.now();
        int daysUntilClosing = (int) ChronoUnit.DAYS.between(now, cycleEnd);
        if (daysUntilClosing < 0) daysUntilClosing = 0;
        boolean closed = cycleEnd.isBefore(now);

        return CardCycleResponse.builder()
                .id(card.getId())
                .name(card.getName())
                .color(card.getColor())
                .brand(card.getBrand())
                .closingDay(card.getClosingDay())
                .dueDay(card.getDueDay())
                .creditLimit(card.getCreditLimit())
                .cycleStart(cycleStart)
                .cycleEnd(cycleEnd)
                .totalSpent(totalSpent)
                .percentOfLimit(percentOfLimit)
                .percentOfSalary(percentOfSalary)
                .daysUntilClosing(daysUntilClosing)
                .transactionCount((int) count)
                .closed(closed)
                .build();
    }

    /**
     * Retorna [cycleStart, cycleEnd] do ciclo ABERTO (em formacao).
     * nextClosing = primeiro dia >= today com dia == closingDay (cap pelo ultimo dia do mes)
     * cycleStart = previousClosing + 1 dia, cycleEnd = nextClosing.
     */
    private LocalDate[] currentCycle(LocalDate today, int closingDay) {
        YearMonth currentYm = YearMonth.from(today);
        int thisMonthClosing = Math.min(closingDay, currentYm.lengthOfMonth());
        LocalDate nextClosing;
        if (today.getDayOfMonth() <= thisMonthClosing) {
            nextClosing = currentYm.atDay(thisMonthClosing);
        } else {
            YearMonth next = currentYm.plusMonths(1);
            int nextMonthClosing = Math.min(closingDay, next.lengthOfMonth());
            nextClosing = next.atDay(nextMonthClosing);
        }
        YearMonth prevYm = YearMonth.from(nextClosing).minusMonths(1);
        int prevClosingDay = Math.min(closingDay, prevYm.lengthOfMonth());
        LocalDate previousClosing = prevYm.atDay(prevClosingDay);
        LocalDate cycleStart = previousClosing.plusDays(1);
        return new LocalDate[]{cycleStart, nextClosing};
    }

    private CardResponse toResponse(Card c) {
        return CardResponse.builder()
                .id(c.getId())
                .name(c.getName())
                .color(c.getColor())
                .brand(c.getBrand())
                .closingDay(c.getClosingDay())
                .dueDay(c.getDueDay())
                .creditLimit(c.getCreditLimit())
                .active(c.getActive())
                .build();
    }

    private TransactionResponse transactionToResponse(Transaction t) {
        return TransactionResponse.builder()
                .id(t.getId())
                .categoryId(t.getCategory().getId())
                .categoryName(t.getCategory().getName())
                .categoryColor(t.getCategory().getColor())
                .cardId(t.getCard() != null ? t.getCard().getId() : null)
                .cardName(t.getCard() != null ? t.getCard().getName() : null)
                .cardColor(t.getCard() != null ? t.getCard().getColor() : null)
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
                .recurringGroupId(t.getRecurringGroupId())
                .installmentGroupId(t.getInstallmentGroupId())
                .currentInstallment(t.getCurrentInstallment())
                .totalInstallments(t.getTotalInstallments())
                .createdAt(t.getCreatedAt())
                .build();
    }
}
