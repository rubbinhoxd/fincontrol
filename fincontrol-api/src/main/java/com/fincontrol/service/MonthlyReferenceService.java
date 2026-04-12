package com.fincontrol.service;

import com.fincontrol.dto.request.MonthlyReferenceRequest;
import com.fincontrol.dto.response.MonthlyReferenceResponse;
import com.fincontrol.entity.MonthlyReference;
import com.fincontrol.entity.User;
import com.fincontrol.repository.MonthlyReferenceRepository;
import com.fincontrol.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class MonthlyReferenceService {

    private final MonthlyReferenceRepository monthlyReferenceRepository;
    private final UserRepository userRepository;

    public Optional<MonthlyReferenceResponse> findByYearMonth(UUID userId, String yearMonth) {
        return monthlyReferenceRepository.findByUserIdAndYearMonth(userId, yearMonth)
                .map(this::toResponse);
    }

    public MonthlyReferenceResponse getEffectiveReference(UUID userId, String yearMonth) {
        return monthlyReferenceRepository.findByUserIdAndYearMonth(userId, yearMonth)
                .or(() -> monthlyReferenceRepository.findLatestByUserId(userId))
                .map(this::toResponse)
                .orElse(null);
    }

    @Transactional
    public MonthlyReferenceResponse upsert(UUID userId, String yearMonth, MonthlyReferenceRequest request) {
        User user = userRepository.getReferenceById(userId);

        MonthlyReference ref = monthlyReferenceRepository
                .findByUserIdAndYearMonth(userId, yearMonth)
                .orElseGet(() -> MonthlyReference.builder()
                        .user(user)
                        .yearMonth(yearMonth)
                        .build());

        ref.setSalary(request.getSalary());
        ref.setNotes(request.getNotes());

        return toResponse(monthlyReferenceRepository.save(ref));
    }

    private MonthlyReferenceResponse toResponse(MonthlyReference ref) {
        return MonthlyReferenceResponse.builder()
                .id(ref.getId())
                .yearMonth(ref.getYearMonth())
                .salary(ref.getSalary())
                .notes(ref.getNotes())
                .build();
    }
}
