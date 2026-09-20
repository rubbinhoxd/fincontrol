function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Env var ${name} nao configurada.`);
  }
  return value;
}

/**
 * Config do bot MULTI-TENANT. Sem credenciais de usuario aqui — cada sessao
 * pega JWT do Java via /api/internal/service-token usando INTERNAL_SHARED_SECRET.
 */
export const config = {
  anthropic: {
    apiKey: required('ANTHROPIC_API_KEY'),
    model: process.env.ANTHROPIC_MODEL ?? 'claude-haiku-4-5-20251001',
  },
  fincontrol: {
    apiUrl: required('FINCONTROL_API_URL'), // ex: http://api:8080/api
    internalSecret: required('INTERNAL_SHARED_SECRET'),
  },
  server: {
    port: parseInt(process.env.PORT ?? '3000', 10),
  },
  authDir: process.env.AUTH_DIR ?? '/app/auth_info',
  logLevel: process.env.LOG_LEVEL ?? 'info',
};
