import pino from 'pino';
import { config } from './config.js';
import { sessionManager } from './sessions/manager.js';
import { startApiServer } from './api/server.js';

const logger = pino({ level: config.logLevel }).child({ mod: 'main' });

async function main() {
  logger.info('Iniciando fincontrol-bot (multi-tenant)...');

  // Sobe API HTTP interna primeiro (frontend/Java podem consultar imediatamente)
  startApiServer();

  // Recarrega sessoes existentes do disco em background
  // (Baileys reconecta sem QR se ja tem creds salvas)
  sessionManager
    .loadExistingFromDisk()
    .then(() => logger.info('Sessoes existentes recarregadas'))
    .catch((err) => logger.error({ err }, 'Falha ao recarregar sessoes'));

  logger.info('Bot pronto');
}

main().catch((err) => {
  logger.error({ err }, 'Erro fatal');
  process.exit(1);
});
