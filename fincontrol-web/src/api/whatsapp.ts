import client from './client';

export type BotSessionStatus =
  | 'DISCONNECTED'
  | 'WAITING_QR'
  | 'PENDING_GROUP'
  | 'ACTIVE'
  | 'GROUP_TIMEOUT';

export interface BotSessionSnapshot {
  status: BotSessionStatus;
  qr: string | null;
  allowedJid: string | null;
  groupName: string | null;
}

export const connectWhatsApp = () =>
  client.post<BotSessionSnapshot>('/me/whatsapp/connect');

export const getWhatsAppStatus = () =>
  client.get<BotSessionSnapshot>('/me/whatsapp/status');

export const restartGroupDetection = () =>
  client.post('/me/whatsapp/detect-group');

export const disconnectWhatsApp = () =>
  client.delete('/me/whatsapp');
