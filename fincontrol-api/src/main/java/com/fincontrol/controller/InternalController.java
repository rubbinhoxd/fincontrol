package com.fincontrol.controller;

import com.fincontrol.entity.User;
import com.fincontrol.repository.UserRepository;
import com.fincontrol.security.JwtTokenProvider;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.UUID;

/**
 * Endpoints internos (chamados pelo container do bot).
 * Autenticacao via header `X-Internal-Secret` que bate com INTERNAL_SHARED_SECRET.
 * Nao expostos publicamente — so pela rede docker interna.
 */
@RestController
@RequestMapping("/api/internal")
@RequiredArgsConstructor
public class InternalController {

    private final UserRepository userRepository;
    private final JwtTokenProvider jwtTokenProvider;

    @Value("${app.bot.internal-secret:}")
    private String internalSecret;

    /**
     * Bot pede um JWT valido em nome de um usuario especifico, pra fazer
     * requests como aquele user (criar transacao, etc).
     */
    @PostMapping("/service-token")
    public ResponseEntity<?> serviceToken(
            @RequestHeader(value = "X-Internal-Secret", required = false) String providedSecret,
            @RequestBody Map<String, String> body
    ) {
        if (internalSecret == null || internalSecret.isBlank() || !internalSecret.equals(providedSecret)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "unauthorized"));
        }

        String userIdRaw = body.get("userId");
        if (userIdRaw == null || userIdRaw.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "userId obrigatorio"));
        }

        UUID userId;
        try {
            userId = UUID.fromString(userIdRaw);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", "userId invalido"));
        }

        User user = userRepository.findById(userId).orElse(null);
        if (user == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "user not found"));
        }

        String token = jwtTokenProvider.generateToken(user.getId(), user.getEmail());
        return ResponseEntity.ok(Map.of("token", token, "email", user.getEmail()));
    }
}
