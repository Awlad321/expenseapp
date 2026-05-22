import { apiClient } from '../../../services/api/apiClient';
import { endpoints } from '../../../services/api/endpoints';
import type { Transaction, TransactionType } from '../../../shared/types/api';

export interface TransactionPayload {
  accountId: number;
  categoryId: number;
  amount: number;
  transactionDate: string;
  note?: string;
}

export const transactionService = {
  async list(params?: { type?: TransactionType; month?: string }) {
    const { data } = await apiClient.get<Transaction[]>(endpoints.transactions, { params });
    return data;
  },
  async exportCsv(month: string) {
    const { data } = await apiClient.get<string>(`${endpoints.transactions}/export`, {
      params: { month },
      responseType: 'text',
    });
    return data;
  },
  async createIncome(payload: TransactionPayload) {
    const { data } = await apiClient.post<Transaction>(endpoints.income, payload);
    return data;
  },
  async createExpense(payload: TransactionPayload) {
    const { data } = await apiClient.post<Transaction>(endpoints.expense, payload);
    return data;
  },
  async remove(id: number) {
    await apiClient.delete(`${endpoints.transactions}/${id}`);
  },
};
