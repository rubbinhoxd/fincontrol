import client from './client';

export const unsubscribe = (token: string) =>
  client.post<{ ok: boolean }>('/notifications/unsubscribe', { token });
