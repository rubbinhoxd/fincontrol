import express, { Request, Response, NextFunction } from 'express';
import pino from 'pino';
import { config } from '../config.js';
import { sessionManager } from '../sessions/manager.js';

const logger = pino({ level: config.logLevel }).child({ mod: 'api' });

/**
 * API HTTP interna. Autenticacao via Bearer INTERNAL_SHARED_SECRET.
 * So exposta na rede docker interna — nunca na internet publica.
 */
export function startApiServer(): void {
  const app = express();
  app.use(express.json());

  // Middleware de auth
  app.use((req: Request, res: Response, next: NextFunction) => {
    const auth = req.headers.authorization;
    if (auth !== `Bearer ${config.fincontrol.internalSecret}`) {
      return res.status(401).json({ error: 'unauthorized' });
    }
    next();
  });

  app.get('/health', (_req, res) => res.json({ ok: true }));

  // POST /sessions/:userId — cria ou reinicia sessao
  app.post('/sessions/:userId', async (req, res) => {
    const userId = req.params.userId;
    try {
      const session = sessionManager.getOrCreate(userId);
      // Se ja tem sock ativo, start() e no-op. Caso contrario, sobe.
      await session.start();
      res.json(session.getStatus());
    } catch (err: any) {
      logger.error({ err, userId }, 'Falha ao criar sessao');
      res.status(500).json({ error: err.message });
    }
  });

  // GET /sessions/:userId — status atual
  app.get('/sessions/:userId', (req, res) => {
    const session = sessionManager.get(req.params.userId);
    if (!session) return res.status(404).json({ error: 'session not found' });
    res.json(session.getStatus());
  });

  // POST /sessions/:userId/detect-group — reinicia deteccao de grupo
  app.post('/sessions/:userId/detect-group', (req, res) => {
    const session = sessionManager.get(req.params.userId);
    if (!session) return res.status(404).json({ error: 'session not found' });
    session.restartGroupDetection();
    res.json(session.getStatus());
  });

  // DELETE /sessions/:userId — desconecta e apaga auth
  app.delete('/sessions/:userId', async (req, res) => {
    try {
      await sessionManager.delete(req.params.userId);
      res.status(204).send();
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.listen(config.server.port, () => {
    logger.info({ port: config.server.port }, 'API interna do bot escutando');
  });
}
