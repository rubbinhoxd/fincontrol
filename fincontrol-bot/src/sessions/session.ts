import makeWASocket, {
  DisconnectReason,
  downloadMediaMessage,
  useMultiFileAuthState,
  WASocket,
} from '@whiskeysockets/baileys';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { rm } from 'node:fs/promises';
import { join } from 'node:path';
import pino from 'pino';
import QRCode from 'qrcode';
import { config } from '../config.js';
import { FincontrolClient } from '../fincontrol.js';
import { handleMessage, processFaturaBatch, FaturaBatch, PendingDuplicates } from './messageHandler.js';
import { PendingImport } from '../types.js';

const logger = pino({ level: config.logLevel }).child({ mod: 'session' });

export type SessionStatus = 'DISCONNECTED' | 'WAITING_QR' | 'PENDING_GROUP' | 'ACTIVE' | 'GROUP_TIMEOUT';

const GROUP_DETECTION_MINUTES = 10;

/**
 * Encapsula uma sessao Baileys isolada por usuario:
 *  - socket proprio
 *  - pasta auth propria (auth_info/<userId>/)
 *  - client Fincontrol proprio (JWT do user)
 *  - deteccao de JID de grupo apos conexao
 *  - contexto de pending imports (fatura)
 */
export class Session {
  readonly userId: string;
  private sock: WASocket | null = null;
  private status: SessionStatus = 'DISCONNECTED';
  private currentQrDataUrl: string | null = null;
  private allowedJid: string | null = null;
  private groupName: string | null = null;
  private detectionDeadline: Date | null = null;
  private sentMessageIds = new Set<string>();
  private readonly maxTrackedIds = 200;

  readonly fincontrol: FincontrolClient;
  readonly pendingImports = new Map<string, PendingImport>();
  // Batches de imagens em andamento (debounce). Chave = jid.
  readonly imageBatches = new Map<string, FaturaBatch>();
  // Duplicatas aguardando confirmacao do usuario ("cadastrar mesmo assim?"). Chave = jid.
  readonly pendingDuplicates = new Map<string, PendingDuplicates>();

  constructor(userId: string, allowedJid: string | null) {
    this.userId = userId;
    this.fincontrol = new FincontrolClient(userId);
    // Se ha meta persistido em disco, recupera. Caso contrario usa o valor passado.
    const meta = this.loadMeta();
    if (meta) {
      this.allowedJid = meta.allowedJid;
      this.groupName = meta.groupName;
    } else {
      this.allowedJid = allowedJid;
    }
  }

  private metaFile(): string {
    return join(this.authDir(), 'session-meta.json');
  }

  private loadMeta(): { allowedJid: string | null; groupName: string | null } | null {
    try {
      if (!existsSync(this.metaFile())) return null;
      return JSON.parse(readFileSync(this.metaFile(), 'utf8'));
    } catch {
      return null;
    }
  }

  private saveMeta(): void {
    try {
      mkdirSync(this.authDir(), { recursive: true });
      writeFileSync(
        this.metaFile(),
        JSON.stringify({ allowedJid: this.allowedJid, groupName: this.groupName })
      );
    } catch (err) {
      logger.warn({ err, userId: this.userId }, 'Falha ao persistir session-meta');
    }
  }

  getStatus() {
    return {
      status: this.status,
      qr: this.currentQrDataUrl,
      allowedJid: this.allowedJid,
      groupName: this.groupName,
    };
  }

  private authDir(): string {
    return join(config.authDir, this.userId);
  }

  /**
   * Sobe o socket Baileys. Se ja tem auth persistida em disco, reconecta;
   * senao, emite QR pra scan.
   */
  async start(): Promise<void> {
    if (this.sock) {
      logger.warn({ userId: this.userId }, 'Sessao ja iniciada');
      return;
    }

    const { state, saveCreds } = await useMultiFileAuthState(this.authDir());

    this.sock = makeWASocket({
      auth: state,
      printQRInTerminal: false,
      logger: pino({ level: 'silent' }) as any,
      syncFullHistory: false,
      keepAliveIntervalMs: 25_000,
      retryRequestDelayMs: 500,
      connectTimeoutMs: 60_000,
      defaultQueryTimeoutMs: 60_000,
      // NAO marca a sessao como online. Se marcar, o WhatsApp assume que o bot
      // ja esta recebendo tudo em tempo real e para de mandar push pro celular
      // do usuario. Com false, o celular continua recebendo notificacoes normais.
      markOnlineOnConnect: false,
    });

    this.sock.ev.on('creds.update', saveCreds);

    this.sock.ev.on('connection.update', (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        this.status = 'WAITING_QR';
        // Baileys emite QR como string; converte pra data URL PNG pra facil consumo no frontend
        QRCode.toDataURL(qr, { margin: 1, scale: 6 })
          .then((dataUrl) => {
            this.currentQrDataUrl = dataUrl;
            logger.info({ userId: this.userId }, 'QR gerado');
          })
          .catch((err) => logger.error({ err, userId: this.userId }, 'Falha ao gerar QR data URL'));
      }

      if (connection === 'open') {
        this.currentQrDataUrl = null;
        logger.info({ userId: this.userId }, 'Conectado ao WhatsApp');
        // Se ja tinha JID capturado (reconexao), volta pra ACTIVE. Senao, entra em PENDING_GROUP.
        if (this.allowedJid) {
          this.status = 'ACTIVE';
        } else {
          this.status = 'PENDING_GROUP';
          this.detectionDeadline = new Date(Date.now() + GROUP_DETECTION_MINUTES * 60_000);
        }
      }

      if (connection === 'close') {
        const errAny = lastDisconnect?.error as any;
        const statusCode = errAny?.output?.statusCode ?? errAny?.statusCode;
        const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
        logger.warn({ userId: this.userId, statusCode, shouldReconnect }, 'Conexao caiu');
        this.sock = null;
        if (shouldReconnect) {
          // Reconecta com backoff simples (2s)
          setTimeout(() => this.start().catch((e) => logger.error({ err: e, userId: this.userId }, 'Reconnect falhou')), 2000);
        } else {
          // loggedOut ou auth invalida — apaga o auth_info pra proximo start pedir QR novo.
          // Senao a sessao entra em loop de reconexao com creds ja invalidas.
          this.status = 'DISCONNECTED';
          this.allowedJid = null;
          this.groupName = null;
          this.wipe().catch((e) => logger.error({ err: e, userId: this.userId }, 'Wipe apos loggedOut falhou'));
        }
      }
    });

    this.sock.ev.on('messages.upsert', async ({ messages, type }) => {
      if (type !== 'notify') return;

      for (const msg of messages) {
        const jid = msg.key.remoteJid;
        if (!jid) continue;
        if (msg.key.id && this.sentMessageIds.has(msg.key.id)) continue;

        // Detecao automatica de JID: procura primeira msg do proprio user em grupo
        if (this.status === 'PENDING_GROUP' && !this.allowedJid) {
          const now = new Date();
          const expired = this.detectionDeadline && now > this.detectionDeadline;
          if (expired) {
            this.status = 'GROUP_TIMEOUT';
            logger.info({ userId: this.userId }, 'Janela de deteccao de grupo expirou');
            continue;
          }
          const isGroup = jid.endsWith('@g.us');
          const isFromMe = msg.key.fromMe === true;
          if (isGroup && isFromMe) {
            this.allowedJid = jid;
            try {
              const meta = await this.sock!.groupMetadata(jid);
              this.groupName = meta.subject ?? null;
            } catch (err) {
              logger.warn({ userId: this.userId, err }, 'Nao consegui pegar nome do grupo');
            }
            this.status = 'ACTIVE';
            this.detectionDeadline = null;
            this.saveMeta();
            logger.info({ userId: this.userId, jid, groupName: this.groupName }, 'JID capturado');
            // Nao processa essa msg como comando — foi so a msg de ativacao
            continue;
          }
        }

        // A partir daqui, so processa se ACTIVE e vier do JID autorizado
        if (this.status !== 'ACTIVE' || jid !== this.allowedJid) continue;

        // Extrai texto e imagem
        const imageMessage = msg.message?.imageMessage;
        const isImage = !!imageMessage;
        const text = isImage
          ? imageMessage?.caption ?? ''
          : msg.message?.conversation ?? msg.message?.extendedTextMessage?.text ?? '';

        if (!isImage && !text.trim()) continue;

        const incoming = {
          jid,
          fromMe: !!msg.key.fromMe,
          text,
          imageBuffer: undefined as Buffer | undefined,
          imageMimeType: undefined as string | undefined,
        };

        if (isImage) {
          try {
            const buffer = await downloadMediaMessage(msg, 'buffer', {});
            incoming.imageBuffer = buffer as Buffer;
            incoming.imageMimeType = normalizeMime(imageMessage?.mimetype);
          } catch (err) {
            logger.error({ err, userId: this.userId }, 'Falha ao baixar imagem');
            await this.reply(jid, 'Nao consegui baixar a imagem. Tenta enviar de novo.');
            continue;
          }
        }

        try {
          await handleMessage(this, incoming);
        } catch (err) {
          logger.error({ err, userId: this.userId }, 'Erro ao processar mensagem');
          try {
            await this.reply(jid, 'Ops, deu erro aqui. Tenta de novo.');
          } catch {}
        }
      }
    });
  }

  async reply(jid: string, text: string): Promise<void> {
    if (!this.sock) throw new Error('Socket nao conectado');
    const sent = await this.sock.sendMessage(jid, { text });
    const id = sent?.key?.id;
    if (id) {
      this.sentMessageIds.add(id);
      if (this.sentMessageIds.size > this.maxTrackedIds) {
        const first = this.sentMessageIds.values().next().value;
        if (first) this.sentMessageIds.delete(first);
      }
    }
  }

  /** Reinicia janela de deteccao de grupo (usuario clicou "reiniciar"). */
  restartGroupDetection(): void {
    if (this.status === 'ACTIVE') {
      // Ja tem grupo, ignora
      return;
    }
    this.allowedJid = null;
    this.groupName = null;
    this.status = 'PENDING_GROUP';
    this.detectionDeadline = new Date(Date.now() + GROUP_DETECTION_MINUTES * 60_000);
    // Se tinha meta antigo, apaga (senao reboot recuperaria JID errado)
    try { if (existsSync(this.metaFile())) require('node:fs').unlinkSync(this.metaFile()); } catch {}
    logger.info({ userId: this.userId }, 'Deteccao de grupo reiniciada');
  }

  /** Desconecta sessao mas mantem auth_info no disco (permite reconectar sem QR). */
  async stop(): Promise<void> {
    try {
      this.sock?.end(undefined);
    } catch {}
    this.sock = null;
    this.status = 'DISCONNECTED';
  }

  /** Desconecta E apaga auth_info do disco (proximo start pede QR novo). */
  async wipe(): Promise<void> {
    await this.stop();
    if (existsSync(this.authDir())) {
      await rm(this.authDir(), { recursive: true, force: true });
    }
    this.allowedJid = null;
    this.groupName = null;
    this.currentQrDataUrl = null;
    logger.info({ userId: this.userId }, 'Sessao apagada');
  }
}

function normalizeMime(raw?: string | null): 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif' {
  if (!raw) return 'image/jpeg';
  const lower = raw.toLowerCase();
  if (lower.includes('png')) return 'image/png';
  if (lower.includes('webp')) return 'image/webp';
  if (lower.includes('gif')) return 'image/gif';
  return 'image/jpeg';
}
