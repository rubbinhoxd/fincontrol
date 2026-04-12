package com.fincontrol.repository;

import com.fincontrol.entity.MonthlyReference;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.Optional;
import java.util.UUID;

public interface MonthlyReferenceRepository extends JpaRepository<MonthlyReference, UUID> {

    Optional<MonthlyReference> findByUserIdAndYearMonth(UUID userId, String yearMonth);

    @Query("SELECT mr FROM MonthlyReference mr WHERE mr.user.id = :userId ORDER BY mr.yearMonth DESC LIMIT 1")
    Optional<MonthlyReference> findLatestByUserId(UUID userId);
}
