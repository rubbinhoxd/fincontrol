function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Env var ${name} nao configurada. Veja .env.example.`);
  }
  return value;
}

export const config = {
  anthropic: {
    apiKey: required('ANTHROPIC_API_KEY'),
    model: process.env.ANTHROPIC_MODEL ?? 'claude-haiku-4-5-20251001',
  },
  fincontrol: {
    apiUrl: required('FINCONTROL_API_URL'),
    email: required('FINCONTROL_EMAIL'),
    password: required('FINCONTROL_PASSWORD'),
  },
  whatsapp: {
    // Opcional: se vazio, o bot entra em modo setup (loga JIDs e nao processa)
    allowedJid: process.env.ALLOWED_JID ?? '',
    // Diretorio de auth do Baileys (persistido em volume)
    authDir: process.env.AUTH_DIR ?? '/app/auth_info',
  },
  logLevel: process.env.LOG_LEVEL ?? 'info',
};

export const setupMode = !config.whatsapp.allowedJid;
