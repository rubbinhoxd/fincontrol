package com.fincontrol.controller;

import com.fincontrol.dto.response.DashboardResponse;
import com.fincontrol.service.DashboardService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/dashboard")
@RequiredArgsConstructor
public class DashboardController {

    private final DashboardService dashboardService;

    @GetMapping
    public ResponseEntity<DashboardResponse> getDashboard(
            @AuthenticationPrincipal UUID userId,
            @RequestParam String yearMonth) {
        return ResponseEntity.ok(dashboardService.getDashboard(userId, yearMonth));
    }
}
