package com.fincontrol.controller;

import com.fincontrol.service.BotSessionService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

/**
 * Endpoints que o frontend consome pra gerenciar a sessao WhatsApp
 * do usuario logado. Tudo autenticado com JWT.
 */
@RestController
@RequestMapping("/api/me/whatsapp")
@RequiredArgsConstructor
public class WhatsAppController {

    private final BotSessionService botSessionService;

    @PostMapping("/connect")
    public ResponseEntity<BotSessionService.SessionSnapshot> connect(@AuthenticationPrincipal UUID userId) {
        return ResponseEntity.ok(botSessionService.connect(userId));
    }

    @GetMapping("/status")
    public ResponseEntity<BotSessionService.SessionSnapshot> status(@AuthenticationPrincipal UUID userId) {
        return ResponseEntity.ok(botSessionService.getStatus(userId));
    }

    @PostMapping("/detect-group")
    public ResponseEntity<Void> restartDetection(@AuthenticationPrincipal UUID userId) {
        botSessionService.restartGroupDetection(userId);
        return ResponseEntity.ok().build();
    }

    @DeleteMapping
    public ResponseEntity<Void> disconnect(@AuthenticationPrincipal UUID userId) {
        botSessionService.disconnect(userId);
        return ResponseEntity.ok().build();
    }
}
