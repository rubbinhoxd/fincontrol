import client from './client';
import type { Transaction, TransactionRequest, TransactionType } from '../types';

export const listTransactions = (yearMonth: string, type?: TransactionType, categoryId?: string) => {
  const params: Record<string, string> = { yearMonth };
  if (type) params.type = type;
  if (categoryId) params.categoryId = categoryId;
  return client.get<Transaction[]>('/transactions', { params });
};

export const getTransaction = (id: string) =>
  client.get<Transaction>(`/transactions/${id}`);

export const createTransaction = (data: TransactionRequest) =>
  client.post<Transaction>('/transactions', data);

export const updateTransaction = (id: string, data: TransactionRequest) =>
  client.put<Transaction>(`/transactions/${id}`, data);

export const deleteTransaction = (id: string) =>
  client.delete(`/transactions/${id}`);
