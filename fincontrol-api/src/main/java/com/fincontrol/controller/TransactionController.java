package com.fincontrol.controller;

import com.fincontrol.dto.request.TransactionRequest;
import com.fincontrol.dto.response.TransactionResponse;
import com.fincontrol.enums.TransactionType;
import com.fincontrol.exception.DuplicateTransactionException;
import com.fincontrol.service.TransactionService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/transactions")
@RequiredArgsConstructor
public class TransactionController {

    private final TransactionService transactionService;

    @GetMapping
    public ResponseEntity<List<TransactionResponse>> list(
            @AuthenticationPrincipal UUID userId,
            @RequestParam String yearMonth,
            @RequestParam(required = false) TransactionType type,
            @RequestParam(required = false) UUID categoryId) {
        return ResponseEntity.ok(transactionService.findByMonth(userId, yearMonth, type, categoryId));
    }

    @GetMapping("/{id}")
    public ResponseEntity<TransactionResponse> getById(
            @AuthenticationPrincipal UUID userId,
            @PathVariable UUID id) {
        return ResponseEntity.ok(transactionService.findById(userId, id));
    }

    @PostMapping
    public ResponseEntity<?> create(
            @AuthenticationPrincipal UUID userId,
            @Valid @RequestBody TransactionRequest request,
            @RequestParam(name = "force", defaultValue = "false") boolean force) {
        try {
            TransactionResponse created = transactionService.create(userId, request, force);
            return ResponseEntity.status(HttpStatus.CREATED).body(created);
        } catch (DuplicateTransactionException e) {
            // 409 com payload da existente — bot/frontend pergunta ao usuario;
            // se ele confirmar, chama de novo com ?force=true.
            return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of(
                    "error", "DUPLICATE_TRANSACTION",
                    "message", e.getMessage(),
                    "existing", e.getExisting()
            ));
        }
    }

    @PutMapping("/{id}")
    public ResponseEntity<TransactionResponse> update(
            @AuthenticationPrincipal UUID userId,
            @PathVariable UUID id,
            @Valid @RequestBody TransactionRequest request) {
        return ResponseEntity.ok(transactionService.update(userId, id, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(
            @AuthenticationPrincipal UUID userId,
            @PathVariable UUID id,
            @RequestParam(defaultValue = "single") String mode) {
        transactionService.delete(userId, id, mode);
        return ResponseEntity.noContent().build();
    }
}
