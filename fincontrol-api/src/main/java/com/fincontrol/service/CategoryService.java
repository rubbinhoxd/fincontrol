package com.fincontrol.service;

import com.fincontrol.dto.request.CategoryRequest;
import com.fincontrol.dto.response.CategoryResponse;
import com.fincontrol.entity.Category;
import com.fincontrol.entity.User;
import com.fincontrol.enums.TransactionType;
import com.fincontrol.exception.ResourceNotFoundException;
import com.fincontrol.repository.CategoryRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class CategoryService {

    private final CategoryRepository categoryRepository;

    public List<CategoryResponse> findAll(UUID userId, TransactionType type) {
        List<Category> categories;
        if (type != null) {
            categories = categoryRepository.findByUserIdAndTypeAndActiveTrue(userId, type);
        } else {
            categories = categoryRepository.findByUserIdAndActiveTrue(userId);
        }
        return categories.stream().map(this::toResponse).toList();
    }

    @Transactional
    public CategoryResponse create(UUID userId, CategoryRequest request, User user) {
        Category category = Category.builder()
                .user(user)
                .name(request.getName())
                .type(request.getType())
                .icon(request.getIcon())
                .color(request.getColor())
                .build();
        return toResponse(categoryRepository.save(category));
    }

    @Transactional
    public CategoryResponse update(UUID userId, UUID categoryId, CategoryRequest request) {
        Category category = categoryRepository.findById(categoryId)
                .filter(c -> c.getUser().getId().equals(userId))
                .orElseThrow(() -> new ResourceNotFoundException("Category", categoryId));

        category.setName(request.getName());
        category.setType(request.getType());
        category.setIcon(request.getIcon());
        category.setColor(request.getColor());

        return toResponse(categoryRepository.save(category));
    }

    @Transactional
    public void delete(UUID userId, UUID categoryId) {
        Category category = categoryRepository.findById(categoryId)
                .filter(c -> c.getUser().getId().equals(userId))
                .orElseThrow(() -> new ResourceNotFoundException("Category", categoryId));

        category.setActive(false);
        categoryRepository.save(category);
    }

    @Transactional
    public void seedDefaultCategories(User user) {
        List<Category> defaults = List.of(
            buildCategory(user, "Moradia",      TransactionType.EXPENSE, "home",          "#6366F1"),
            buildCategory(user, "Alimentacao",  TransactionType.EXPENSE, "utensils",      "#F59E0B"),
            buildCategory(user, "Transporte",   TransactionType.EXPENSE, "car",           "#3B82F6"),
            buildCategory(user, "Saude",        TransactionType.EXPENSE, "heart-pulse",   "#EF4444"),
            buildCategory(user, "Educacao",     TransactionType.EXPENSE, "graduation-cap","#8B5CF6"),
            buildCategory(user, "Lazer",        TransactionType.EXPENSE, "gamepad-2",     "#EC4899"),
            buildCategory(user, "Assinaturas",  TransactionType.EXPENSE, "repeat",        "#14B8A6"),
            buildCategory(user, "Vestuario",    TransactionType.EXPENSE, "shirt",         "#F97316"),
            buildCategory(user, "Outros",       TransactionType.EXPENSE, "ellipsis",      "#6B7280"),
            buildCategory(user, "Salario",      TransactionType.INCOME,  "banknote",      "#22C55E"),
            buildCategory(user, "Plantoes",     TransactionType.INCOME,  "clock",         "#0EA5E9"),
            buildCategory(user, "Freelance",    TransactionType.INCOME,  "laptop",        "#06B6D4"),
            buildCategory(user, "Investimentos",TransactionType.INCOME,  "trending-up",   "#A855F7"),
            buildCategory(user, "Outros",       TransactionType.INCOME,  "ellipsis",      "#6B7280")
        );
        categoryRepository.saveAll(defaults);
    }

    private Category buildCategory(User user, String name, TransactionType type, String icon, String color) {
        return Category.builder()
                .user(user)
                .name(name)
                .type(type)
                .icon(icon)
                .color(color)
                .build();
    }

    private CategoryResponse toResponse(Category category) {
        return CategoryResponse.builder()
                .id(category.getId())
                .name(category.getName())
                .type(category.getType())
                .icon(category.getIcon())
                .color(category.getColor())
                .active(category.getActive())
                .build();
    }
}
