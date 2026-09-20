import client from './client';
import type { AuthResponse } from '../types';

export const login = (email: string, password: string) =>
  client.post<AuthResponse>('/auth/login', { email, password });

export const register = (name: string, email: string, password: string) =>
  client.post<AuthResponse>('/auth/register', { name, email, password });

export const verifyEmail = (token: string) =>
  client.get<{ verified: boolean }>('/auth/verify', { params: { token } });

export const resendVerification = (email: string) =>
  client.post<{ ok: boolean }>('/auth/resend-verification', { email });
