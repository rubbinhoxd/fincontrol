package com.fincontrol.controller;

import com.fincontrol.dto.request.MonthlyReferenceRequest;
import com.fincontrol.dto.response.MonthlyReferenceResponse;
import com.fincontrol.service.MonthlyReferenceService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/monthly-references")
@RequiredArgsConstructor
public class MonthlyReferenceController {

    private final MonthlyReferenceService monthlyReferenceService;

    @GetMapping("/{yearMonth}")
    public ResponseEntity<MonthlyReferenceResponse> get(
            @AuthenticationPrincipal UUID userId,
            @PathVariable String yearMonth) {
        return monthlyReferenceService.findByYearMonth(userId, yearMonth)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PutMapping("/{yearMonth}")
    public ResponseEntity<MonthlyReferenceResponse> upsert(
            @AuthenticationPrincipal UUID userId,
            @PathVariable String yearMonth,
            @Valid @RequestBody MonthlyReferenceRequest request) {
        return ResponseEntity.ok(monthlyReferenceService.upsert(userId, yearMonth, request));
    }
}
