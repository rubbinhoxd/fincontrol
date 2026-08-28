import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState,
  WASocket,
} from '@whiskeysockets/baileys';
import pino from 'pino';
import qrcode from 'qrcode-terminal';
import { config, setupMode } from './config.js';

const logger = pino({ level: config.logLevel }).child({ mod: 'wa' });

export type IncomingMessage = {
  jid: string;
  fromMe: boolean;
  text: string;
};

export type ReplyFn = (jid: string, text: string) => Promise<void>;

/**
 * Sobe o socket do Baileys, autentica (QR se necessario) e chama onMessage
 * para cada mensagem de texto recebida. Retorna a funcao reply pra responder.
 */
export async function startWhatsApp(
  onMessage: (msg: IncomingMessage, reply: ReplyFn) => Promise<void>
): Promise<ReplyFn> {
  const { state, saveCreds } = await useMultiFileAuthState(config.whatsapp.authDir);

  const sock: WASocket = makeWASocket({
    auth: state,
    printQRInTerminal: false, // vamos imprimir manualmente
    logger: pino({ level: 'silent' }) as any,
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
      // Extrai statusCode do erro sem depender de tipos externos
      const errAny = lastDisconnect?.error as any;
      const statusCode = errAny?.output?.statusCode ?? errAny?.statusCode;
      const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
      logger.warn({ statusCode, shouldReconnect }, 'Conexao caiu');
      if (shouldReconnect) {
        // Reinicia o processo — o docker restart:unless-stopped cuida
        process.exit(1);
      }
    }
  });

  // Track dos IDs de mensagens que ESTE bot enviou. Serve pra evitar
  // loop infinito: como o WhatsApp Web ecoa as mensagens sent do bot
  // de volta como `fromMe: true`, precisamos ignorar apenas essas.
  const sentMessageIds = new Set<string>();
  const MAX_TRACKED_IDS = 200;

  const reply: ReplyFn = async (jid, text) => {
    const sent = await sock.sendMessage(jid, { text });
    const id = sent?.key?.id;
    if (id) {
      sentMessageIds.add(id);
      // Poda para nao crescer indefinidamente
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

      // So ignora mensagem echoada da propria resposta do bot.
      // NAO ignora mensagens do usuario proprio, pois em grupo solo
      // (unipessoal) todas as mensagens vem com fromMe=true.
      if (msg.key.id && sentMessageIds.has(msg.key.id)) continue;

      // Extrai o texto da mensagem
      const text =
        msg.message?.conversation ??
        msg.message?.extendedTextMessage?.text ??
        '';

      if (!text.trim()) continue;

      // Modo setup: loga JID de qualquer mensagem e nao processa
      if (setupMode) {
        logger.warn(
          { jid, text: text.substring(0, 40) },
          `[SETUP] Mensagem recebida em JID: ${jid}. Copie isso pra .env como ALLOWED_JID e reinicie.`
        );
        continue;
      }

      // Filtro: so processa mensagens do JID permitido
      if (jid !== config.whatsapp.allowedJid) {
        logger.info({ jid, textPreview: text.substring(0, 40) }, 'Msg ignorada (JID nao autorizado)');
        continue;
      }
      logger.info({ jid, textPreview: text.substring(0, 60) }, 'Msg autorizada, processando');

      try {
        await onMessage({ jid, fromMe: false, text }, reply);
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
