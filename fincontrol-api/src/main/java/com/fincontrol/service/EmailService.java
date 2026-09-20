package com.fincontrol.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.util.Map;

/**
 * Envia emails transacionais via Resend. Usa RestClient built-in do Spring
 * Boot 3 — nao precisa de SDK extra. Se RESEND_API_KEY nao estiver configurada,
 * loga um warning e nao envia (nao quebra o cadastro).
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class EmailService {

    @Value("${app.resend.api-key:}")
    private String apiKey;

    @Value("${app.resend.from:Savey <no-reply@savey.com.br>}")
    private String from;

    @Value("${app.frontend-url:https://savey.com.br}")
    private String frontendUrl;

    public void sendVerificationEmail(String toEmail, String toName, String token) {
        if (apiKey == null || apiKey.isBlank()) {
            log.warn("RESEND_API_KEY nao configurada. Email de verificacao NAO enviado pra {}.", toEmail);
            return;
        }

        String link = frontendUrl + "/verify-email?token=" + token;
        String html = buildVerificationHtml(toName, link);

        try {
            RestClient.create()
                    .post()
                    .uri("https://api.resend.com/emails")
                    .header("Authorization", "Bearer " + apiKey)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(Map.of(
                            "from", from,
                            "to", new String[]{toEmail},
                            "subject", "Confirme seu email — Savey",
                            "html", html
                    ))
                    .retrieve()
                    .toBodilessEntity();
            log.info("Email de verificacao enviado pra {}", toEmail);
        } catch (Exception e) {
            log.error("Falha ao enviar email pra {}: {}", toEmail, e.getMessage());
            // Nao propaga — o usuario ja foi criado, ele pode pedir reenvio depois.
        }
    }

    private String buildVerificationHtml(String name, String link) {
        return """
                <!DOCTYPE html>
                <html>
                <head><meta charset="UTF-8"></head>
                <body style="margin:0;padding:0;background:#f5f5f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
                  <table role="presentation" style="width:100%%;border-collapse:collapse;background:#f5f5f5;padding:40px 20px;">
                    <tr><td align="center">
                      <table role="presentation" style="max-width:520px;width:100%%;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.05);">
                        <tr>
                          <td style="background:#0F3D32;padding:32px 40px;text-align:center;">
                            <h1 style="color:#10B981;margin:0;font-size:32px;font-weight:700;letter-spacing:-0.5px;">Savey</h1>
                            <p style="color:#DFF7EB;margin:8px 0 0;font-size:14px;">smart money, simple control</p>
                          </td>
                        </tr>
                        <tr>
                          <td style="padding:40px;">
                            <h2 style="margin:0 0 16px;color:#0F3D32;font-size:22px;">Ola%s! 👋</h2>
                            <p style="margin:0 0 24px;color:#374151;font-size:16px;line-height:1.6;">
                              Obrigado por criar sua conta no <strong>Savey</strong>! Falta so um passo pra comecar
                              a organizar suas financas: confirmar seu endereco de email.
                            </p>
                            <div style="text-align:center;margin:32px 0;">
                              <a href="%s" style="display:inline-block;background:#10B981;color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:8px;font-weight:600;font-size:16px;">
                                Confirmar meu email
                              </a>
                            </div>
                            <p style="margin:24px 0 0;color:#6B7280;font-size:14px;line-height:1.6;">
                              Ou copia e cola esse link no navegador:<br>
                              <a href="%s" style="color:#10B981;word-break:break-all;">%s</a>
                            </p>
                            <p style="margin:32px 0 0;color:#9CA3AF;font-size:13px;line-height:1.5;">
                              Esse link vai expirar em 24 horas. Se voce nao criou uma conta no Savey, pode ignorar esse email.
                            </p>
                          </td>
                        </tr>
                        <tr>
                          <td style="background:#F9FAFB;padding:20px 40px;text-align:center;">
                            <p style="margin:0;color:#9CA3AF;font-size:12px;">
                              Savey &middot; Controle financeiro pessoal
                            </p>
                          </td>
                        </tr>
                      </table>
                    </td></tr>
                  </table>
                </body>
                </html>
                """.formatted(
                        name != null && !name.isBlank() ? ", " + name.split(" ")[0] : "",
                        link,
                        link,
                        link
                );
    }
}
