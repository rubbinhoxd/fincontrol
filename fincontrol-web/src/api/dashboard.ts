import client from './client';
import type { Dashboard, MonthlyReference } from '../types';

export const getDashboard = (yearMonth: string) =>
  client.get<Dashboard>('/dashboard', { params: { yearMonth } });

export const getMonthlyReference = (yearMonth: string) =>
  client.get<MonthlyReference>(`/monthly-references/${yearMonth}`);

export const upsertMonthlyReference = (yearMonth: string, data: { salary: number; notes?: string }) =>
  client.put<MonthlyReference>(`/monthly-references/${yearMonth}`, data);
