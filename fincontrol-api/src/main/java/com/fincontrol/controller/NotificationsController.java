package com.fincontrol.controller;

import com.fincontrol.service.ReminderService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * Opt-out publico de notificacoes por email.
 * Sem auth — o link vem no proprio email (link opaco com user id).
 */
@RestController
@RequestMapping("/api/notifications")
@RequiredArgsConstructor
public class NotificationsController {

    private final ReminderService reminderService;

    @PostMapping("/unsubscribe")
    public ResponseEntity<?> unsubscribe(@RequestBody Map<String, String> body) {
        String token = body.get("token");
        if (token == null || token.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "token obrigatorio"));
        }
        boolean ok = reminderService.unsubscribe(token);
        // Retorna 200 mesmo se o token era invalido — nao vaza informacao
        return ResponseEntity.ok(Map.of("ok", ok));
    }
}
