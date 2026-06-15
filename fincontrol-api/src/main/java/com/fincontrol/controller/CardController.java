package com.fincontrol.controller;

import com.fincontrol.dto.request.CardRequest;
import com.fincontrol.dto.response.CardCycleDetailResponse;
import com.fincontrol.dto.response.CardCycleResponse;
import com.fincontrol.dto.response.CardResponse;
import com.fincontrol.service.CardService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/cards")
@RequiredArgsConstructor
public class CardController {

    private final CardService cardService;

    @GetMapping
    public ResponseEntity<List<CardResponse>> list(@AuthenticationPrincipal UUID userId) {
        return ResponseEntity.ok(cardService.findAll(userId));
    }

    @PostMapping
    public ResponseEntity<CardResponse> create(
            @AuthenticationPrincipal UUID userId,
            @Valid @RequestBody CardRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(cardService.create(userId, request));
    }

    @PutMapping("/{id}")
    public ResponseEntity<CardResponse> update(
            @AuthenticationPrincipal UUID userId,
            @PathVariable UUID id,
            @Valid @RequestBody CardRequest request) {
        return ResponseEntity.ok(cardService.update(userId, id, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(
            @AuthenticationPrincipal UUID userId,
            @PathVariable UUID id) {
        cardService.delete(userId, id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/cycles")
    public ResponseEntity<List<CardCycleResponse>> cycles(@AuthenticationPrincipal UUID userId) {
        return ResponseEntity.ok(cardService.getAllCycles(userId));
    }

    @GetMapping("/{id}/cycle")
    public ResponseEntity<CardCycleDetailResponse> cycleDetail(
            @AuthenticationPrincipal UUID userId,
            @PathVariable UUID id,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate referenceDate) {
        return ResponseEntity.ok(cardService.getCycleDetail(userId, id, referenceDate));
    }
}
