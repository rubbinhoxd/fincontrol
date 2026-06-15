import client from './client';
import type { Card, CardCycle, CardCycleDetail, CardRequest } from '../types';

export const listCards = () =>
  client.get<Card[]>('/cards');

export const createCard = (data: CardRequest) =>
  client.post<Card>('/cards', data);

export const updateCard = (id: string, data: CardRequest) =>
  client.put<Card>(`/cards/${id}`, data);

export const deleteCard = (id: string) =>
  client.delete(`/cards/${id}`);

export const getCardCycles = () =>
  client.get<CardCycle[]>('/cards/cycles');

export const getCardCycleDetail = (id: string, referenceDate?: string) =>
  client.get<CardCycleDetail>(`/cards/${id}/cycle`, { params: referenceDate ? { referenceDate } : {} });
