import { readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import pino from 'pino';
import { config } from '../config.js';
import { Session } from './session.js';

const logger = pino({ level: config.logLevel }).child({ mod: 'manager' });

// Regex de UUID pra evitar pegar arquivos aleatorios na pasta auth_info
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export class SessionManager {
  private sessions = new Map<string, Session>();

  /** Retorna sessao existente ou cria nova. Nao chama start automaticamente. */
  getOrCreate(userId: string, allowedJid: string | null = null): Session {
    let session = this.sessions.get(userId);
    if (!session) {
      session = new Session(userId, allowedJid);
      this.sessions.set(userId, session);
    }
    return session;
  }

  get(userId: string): Session | null {
    return this.sessions.get(userId) ?? null;
  }

  async delete(userId: string): Promise<void> {
    const session = this.sessions.get(userId);
    if (!session) return;
    await session.wipe();
    this.sessions.delete(userId);
  }

  /**
   * No boot, escaneia auth_info/ e recarrega sessoes que ja tem credentials.
   * Baileys reconecta automaticamente sem precisar de novo QR.
   */
  async loadExistingFromDisk(): Promise<void> {
    if (!existsSync(config.authDir)) {
      logger.info({ authDir: config.authDir }, 'auth_info nao existe, sem sessoes pra recarregar');
      return;
    }

    const entries = readdirSync(config.authDir, { withFileTypes: true });
    const userDirs = entries.filter((e) => e.isDirectory() && UUID_RE.test(e.name));

    logger.info({ count: userDirs.length }, 'Recarregando sessoes existentes do disco');

    for (const dir of userDirs) {
      const userId = dir.name;
      const credsFile = join(config.authDir, userId, 'creds.json');
      if (!existsSync(credsFile)) {
        logger.warn({ userId }, 'Diretorio sem creds.json, pulando');
        continue;
      }
      const session = this.getOrCreate(userId);
      session.start().catch((err) => logger.error({ err, userId }, 'Falha ao restart sessao'));
    }
  }
}

export const sessionManager = new SessionManager();
