package com.fincontrol.repository;

import com.fincontrol.entity.Card;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface CardRepository extends JpaRepository<Card, UUID> {
    List<Card> findByUserIdAndActiveTrueOrderByName(UUID userId);

    Optional<Card> findByIdAndUserId(UUID id, UUID userId);
}
