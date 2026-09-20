package com.fincontrol.service;

import com.fincontrol.dto.request.LoginRequest;
import com.fincontrol.dto.request.RegisterRequest;
import com.fincontrol.dto.response.AuthResponse;
import com.fincontrol.entity.User;
import com.fincontrol.repository.UserRepository;
import com.fincontrol.security.JwtTokenProvider;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.Base64;

@Service
@RequiredArgsConstructor
public class AuthService {

    private static final SecureRandom RANDOM = new SecureRandom();

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider jwtTokenProvider;
    private final CategoryService categoryService;
    private final EmailService emailService;

    @Transactional
    public AuthResponse register(RegisterRequest request) {
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new IllegalArgumentException("Email already registered");
        }

        String token = generateVerificationToken();

        User user = User.builder()
                .name(request.getName())
                .email(request.getEmail())
                .passwordHash(passwordEncoder.encode(request.getPassword()))
                .emailVerified(false)
                .verificationToken(token)
                .verificationTokenExpiresAt(LocalDateTime.now().plusHours(24))
                .build();

        user = userRepository.save(user);

        categoryService.seedDefaultCategories(user);

        emailService.sendVerificationEmail(user.getEmail(), user.getName(), token);

        // Nao emite JWT aqui — o usuario precisa confirmar o email antes de logar.
        return AuthResponse.builder()
                .name(user.getName())
                .email(user.getEmail())
                .emailVerified(false)
                .build();
    }

    public AuthResponse login(LoginRequest request) {
        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new IllegalArgumentException("Invalid email or password"));

        if (!passwordEncoder.matches(request.getPassword(), user.getPasswordHash())) {
            throw new IllegalArgumentException("Invalid email or password");
        }

        if (!user.isEmailVerified()) {
            throw new EmailNotVerifiedException("Email nao verificado. Confira sua caixa de entrada.");
        }

        String jwt = jwtTokenProvider.generateToken(user.getId(), user.getEmail());

        return AuthResponse.builder()
                .token(jwt)
                .name(user.getName())
                .email(user.getEmail())
                .emailVerified(true)
                .build();
    }

    @Transactional
    public void verifyEmail(String token) {
        User user = userRepository.findByVerificationToken(token)
                .orElseThrow(() -> new IllegalArgumentException("Token invalido ou ja utilizado."));

        if (user.getVerificationTokenExpiresAt() != null
                && user.getVerificationTokenExpiresAt().isBefore(LocalDateTime.now())) {
            throw new IllegalArgumentException("Token expirado. Solicite um novo email de verificacao.");
        }

        user.setEmailVerified(true);
        user.setVerificationToken(null);
        user.setVerificationTokenExpiresAt(null);
        userRepository.save(user);
    }

    @Transactional
    public void resendVerification(String email) {
        User user = userRepository.findByEmail(email).orElse(null);
        // Nao expoe se o email existe ou nao — retorna 200 em qualquer caso.
        if (user == null || user.isEmailVerified()) {
            return;
        }

        String token = generateVerificationToken();
        user.setVerificationToken(token);
        user.setVerificationTokenExpiresAt(LocalDateTime.now().plusHours(24));
        userRepository.save(user);

        emailService.sendVerificationEmail(user.getEmail(), user.getName(), token);
    }

    private String generateVerificationToken() {
        byte[] bytes = new byte[32];
        RANDOM.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    public static class EmailNotVerifiedException extends RuntimeException {
        public EmailNotVerifiedException(String message) {
            super(message);
        }
    }
}
