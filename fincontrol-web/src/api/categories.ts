import client from './client';
import type { Category, TransactionType } from '../types';

export const listCategories = (type?: TransactionType) => {
  const params: Record<string, string> = {};
  if (type) params.type = type;
  return client.get<Category[]>('/categories', { params });
};

export const createCategory = (data: { name: string; type: TransactionType; icon?: string; color?: string }) =>
  client.post<Category>('/categories', data);

export const updateCategory = (id: string, data: { name: string; type: TransactionType; icon?: string; color?: string }) =>
  client.put<Category>(`/categories/${id}`, data);

export const deleteCategory = (id: string) =>
  client.delete(`/categories/${id}`);
