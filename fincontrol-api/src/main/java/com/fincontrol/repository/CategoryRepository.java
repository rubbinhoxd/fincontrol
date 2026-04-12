package com.fincontrol.repository;

import com.fincontrol.entity.Category;
import com.fincontrol.enums.TransactionType;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface CategoryRepository extends JpaRepository<Category, UUID> {

    List<Category> findByUserIdAndActiveTrue(UUID userId);

    List<Category> findByUserIdAndTypeAndActiveTrue(UUID userId, TransactionType type);
}
