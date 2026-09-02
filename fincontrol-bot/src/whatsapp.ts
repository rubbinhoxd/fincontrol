import makeWASocket, {
  DisconnectReason,
  downloadMediaMessage,
  useMultiFileAuthState,
  WASocket,
} from '@whiskeysockets/baileys';
import { readFile, rm, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import pino from 'pino';
import qrcode from 'qrcode-terminal';
import { config, setupMode } from './config.js';

const logger = pino({ level: config.logLevel }).child({ mod: 'wa' });

// Auto-recovery: detecta corrupcao de sessao (Bad MAC, MessageCounterError, etc)
// e limpa o auth_info automaticamente. O container reinicia via docker restart policy.
//
// Persiste contador em disco pra sobreviver a restarts. Cenario tipico: sessao
// corrompida causa timeouts que fazem o processo crashar antes de acumular erros
// em memoria. Contador persistido garante que a gente detecta corrupcao mesmo
// atraves de crashes.
const DECRYPT_ERROR_WINDOW_MS = 30_000;
const DECRYPT_ERROR_THRESHOLD = 2;
const RECOVERY_COOLDOWN_MS = 5 * 60_000; // 5min entre recoveries — evita loop se algo estiver muito errado
let recoveryInProgress = false;

interface ErrorState {
  count: number;
  windowStart: number;
  lastRecoveryAt: number;
}

function stateFile(): string {
  return join(config.whatsapp.authDir, '.recovery-state.json');
}

function loadState(): ErrorState {
  try {
    if (existsSync(stateFile())) {
      const raw = require('node:fs').readFileSync(stateFile(), 'utf8');
      return JSON.parse(raw);
    }
  } catch {}
  return { count: 0, windowStart: 0, lastRecoveryAt: 0 };
}

async function saveState(s: ErrorState) {
  try {
    await writeFile(stateFile(), JSON.stringify(s));
  } catch (err) {
    logger.warn({ err }, 'Falha ao persistir estado de recovery');
  }
}

function installSessionCorruptionDetector() {
  const originalError = console.error.bind(console);
  const originalLog = console.log.bind(console);

  const inspect = (args: unknown[]) => {
    const text = args.map((a) => String(a)).join(' ');
    if (
      !recoveryInProgress &&
      (text.includes('Bad MAC') ||
        text.includes('MessageCounterError') ||
        text.includes('Failed to decrypt message'))
    ) {
      const state = loadState();
      const now = Date.now();

      // Nao dispara recovery em cooldown (evita loop)
      if (now - state.lastRecoveryAt < RECOVERY_COOLDOWN_MS) {
        return;
      }

      if (now - state.windowStart > DECRYPT_ERROR_WINDOW_MS) {
        state.windowStart = now;
        state.count = 1;
      } else {
        state.count += 1;
      }

      saveState(state).catch(() => {});

      if (state.count >= DECRYPT_ERROR_THRESHOLD) {
        recoveryInProgress = true;
        triggerAutoRecovery(state).catch((e) => logger.error({ err: e }, 'Auto-recovery falhou'));
      }
    }
  };

  console.error = (...args: any[]) => {
    inspect(args);
    originalError(...args);
  };
  console.log = (...args: any[]) => {
    inspect(args);
    originalLog(...args);
  };
}

async function triggerAutoRecovery(state: ErrorState) {
  logger.error(
    { threshold: DECRYPT_ERROR_THRESHOLD, windowMs: DECRYPT_ERROR_WINDOW_MS, errors: state.count },
    'AUTO-RECOVERY: sessao corrompida detectada. Limpando auth_info e reiniciando. Um NOVO QR CODE aparecera no proximo boot.'
  );
  try {
    await rm(config.whatsapp.authDir, { recursive: true, force: true });
    // Recria o diretorio e reseta o estado com o cooldown marcado
    require('node:fs').mkdirSync(config.whatsapp.authDir, { recursive: true });
    await saveState({ count: 0, windowStart: 0, lastRecoveryAt: Date.now() });
    logger.info('auth_info removido. Encerrando processo — Docker vai reiniciar e um QR novo sera gerado.');
  } catch (err) {
    logger.error({ err }, 'Falha ao remover auth_info');
  }
  setTimeout(() => process.exit(1), 500);
}

export type IncomingMessage = {
  jid: string;
  fromMe: boolean;
  text: string;
  imageBuffer?: Buffer;
  imageMimeType?: 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif';
};

export type ReplyFn = (jid: string, text: string) => Promise<void>;

/**
 * Sobe o socket do Baileys, autentica (QR se necessario) e chama onMessage
 * para cada mensagem recebida (texto ou imagem). Retorna a funcao reply.
 */
export async function startWhatsApp(
  onMessage: (msg: IncomingMessage, reply: ReplyFn) => Promise<void>
): Promise<ReplyFn> {
  installSessionCorruptionDetector();

  const { state, saveCreds } = await useMultiFileAuthState(config.whatsapp.authDir);

  const sock: WASocket = makeWASocket({
    auth: state,
    printQRInTerminal: false,
    logger: pino({ level: 'silent' }) as any,
    // Opcoes de estabilidade — reduzem superficie de corrupcao de sessao
    syncFullHistory: false,        // nao tenta puxar historico completo (menos msgs criptografadas em backlog)
    keepAliveIntervalMs: 25_000,   // ping regular pro WhatsApp nao considerar dispositivo dormente
    retryRequestDelayMs: 500,      // mais tolerante a retries transientes
    connectTimeoutMs: 60_000,      // 60s pra conectar (padrao e menor)
    defaultQueryTimeoutMs: 60_000,
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      logger.info('QR code recebido, escaneie no WhatsApp:');
      qrcode.generate(qr, { small: true });
    }

    if (connection === 'open') {
      logger.info('Conectado ao WhatsApp!');
      if (setupMode) {
        logger.warn(
          '[SETUP] ALLOWED_JID vazio. Crie um grupo dedicado, mande uma msg, e copie o JID que sera logado.'
        );
      }
    }

    if (connection === 'close') {
      const errAny = lastDisconnect?.error as any;
      const statusCode = errAny?.output?.statusCode ?? errAny?.statusCode;
      const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
      logger.warn({ statusCode, shouldReconnect }, 'Conexao caiu');
      if (shouldReconnect) {
        process.exit(1);
      }
    }
  });

  const sentMessageIds = new Set<string>();
  const MAX_TRACKED_IDS = 200;

  const reply: ReplyFn = async (jid, text) => {
    const sent = await sock.sendMessage(jid, { text });
    const id = sent?.key?.id;
    if (id) {
      sentMessageIds.add(id);
      if (sentMessageIds.size > MAX_TRACKED_IDS) {
        const first = sentMessageIds.values().next().value;
        if (first) sentMessageIds.delete(first);
      }
    }
  };

  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return;

    for (const msg of messages) {
      const jid = msg.key.remoteJid;
      if (!jid) continue;

      if (msg.key.id && sentMessageIds.has(msg.key.id)) continue;

      // Detecta se e imagem
      const imageMessage = msg.message?.imageMessage;
      const isImage = !!imageMessage;

      // Extrai texto (para texto puro OU caption de imagem)
      const text = isImage
        ? imageMessage?.caption ?? ''
        : msg.message?.conversation ?? msg.message?.extendedTextMessage?.text ?? '';

      // Ignora mensagens vazias (sem texto e sem imagem)
      if (!isImage && !text.trim()) continue;

      // Modo setup: loga e nao processa
      if (setupMode) {
        logger.warn(
          { jid, isImage, text: text.substring(0, 40) },
          `[SETUP] Mensagem recebida em JID: ${jid}. Copie isso pra .env como ALLOWED_JID e reinicie.`
        );
        continue;
      }

      // Filtro por JID autorizado
      if (jid !== config.whatsapp.allowedJid) {
        logger.info({ jid, isImage, textPreview: text.substring(0, 40) }, 'Msg ignorada (JID nao autorizado)');
        continue;
      }
      logger.info({ jid, isImage, textPreview: text.substring(0, 60) }, 'Msg autorizada, processando');

      const incoming: IncomingMessage = {
        jid,
        fromMe: !!msg.key.fromMe,
        text,
      };

      // Se for imagem, baixa os bytes
      if (isImage) {
        try {
          const buffer = await downloadMediaMessage(msg, 'buffer', {});
          incoming.imageBuffer = buffer as Buffer;
          incoming.imageMimeType = normalizeMime(imageMessage?.mimetype);
          logger.info({ size: (buffer as Buffer).length, mime: incoming.imageMimeType }, 'Imagem baixada');
        } catch (err) {
          logger.error({ err }, 'Falha ao baixar imagem');
          await reply(jid, 'Nao consegui baixar a imagem. Tenta enviar de novo.');
          continue;
        }
      }

      try {
        await onMessage(incoming, reply);
      } catch (err) {
        logger.error({ err }, 'Erro ao processar mensagem');
        try {
          await reply(jid, 'Ops, deu erro aqui. Tenta de novo.');
        } catch {}
      }
    }
  });

  return reply;
}

/** Reduz o mimetype do WhatsApp aos formatos aceitos pela API da Anthropic. */
function normalizeMime(raw?: string | null): 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif' {
  if (!raw) return 'image/jpeg';
  const lower = raw.toLowerCase();
  if (lower.includes('png')) return 'image/png';
  if (lower.includes('webp')) return 'image/webp';
  if (lower.includes('gif')) return 'image/gif';
  return 'image/jpeg';
}
