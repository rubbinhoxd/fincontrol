package com.fincontrol.controller;

import com.fincontrol.dto.request.CategoryRequest;
import com.fincontrol.dto.response.CategoryResponse;
import com.fincontrol.entity.User;
import com.fincontrol.enums.TransactionType;
import com.fincontrol.repository.UserRepository;
import com.fincontrol.service.CategoryService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/categories")
@RequiredArgsConstructor
public class CategoryController {

    private final CategoryService categoryService;
    private final UserRepository userRepository;

    @GetMapping
    public ResponseEntity<List<CategoryResponse>> list(
            @AuthenticationPrincipal UUID userId,
            @RequestParam(required = false) TransactionType type) {
        return ResponseEntity.ok(categoryService.findAll(userId, type));
    }

    @PostMapping
    public ResponseEntity<CategoryResponse> create(
            @AuthenticationPrincipal UUID userId,
            @Valid @RequestBody CategoryRequest request) {
        User user = userRepository.getReferenceById(userId);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(categoryService.create(userId, request, user));
    }

    @PutMapping("/{id}")
    public ResponseEntity<CategoryResponse> update(
            @AuthenticationPrincipal UUID userId,
            @PathVariable UUID id,
            @Valid @RequestBody CategoryRequest request) {
        return ResponseEntity.ok(categoryService.update(userId, id, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(
            @AuthenticationPrincipal UUID userId,
            @PathVariable UUID id) {
        categoryService.delete(userId, id);
        return ResponseEntity.noContent().build();
    }
}
