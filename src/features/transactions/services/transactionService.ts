import { localDatabase } from '../../../services/api/localDatabase';
import type { TransactionType } from '../../../shared/types/api';

export interface TransactionPayload {
  accountId: number;
  categoryId: number;
  amount: number;
  transactionDate: string;
  note?: string;
}

export const transactionService = {
  async list(params?: { type?: TransactionType; month?: string }) {
    return localDatabase.listTransactions(params);
  },
  async get(id: number) {
    return localDatabase.getTransaction(id);
  },
  async exportCsv(month: string) {
    return localDatabase.exportCsv(month);
  },
  async createIncome(payload: TransactionPayload) {
    return localDatabase.createIncome(payload);
  },
  async createExpense(payload: TransactionPayload) {
    return localDatabase.createExpense(payload);
  },
  async remove(id: number) {
    await localDatabase.removeTransaction(id);
  },
  async update(id: number, payload: TransactionPayload) {
    return localDatabase.updateTransaction(id, payload);
  },
};
