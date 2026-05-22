import { apiClient } from '../../../services/api/apiClient';
import { endpoints } from '../../../services/api/endpoints';
import type { Account, AccountLedger, AccountType } from '../../../shared/types/api';

export interface AccountPayload {
  name: string;
  type: AccountType;
  openingBalance: number;
}

export const accountService = {
  async list() {
    const { data } = await apiClient.get<Account[]>(endpoints.accounts);
    return data;
  },
  async create(payload: AccountPayload) {
    const { data } = await apiClient.post<Account>(endpoints.accounts, payload);
    return data;
  },
  async update(id: number, payload: AccountPayload) {
    const { data } = await apiClient.put<Account>(`${endpoints.accounts}/${id}`, payload);
    return data;
  },
  async ledger(id: number) {
    const { data } = await apiClient.get<AccountLedger[]>(`${endpoints.accounts}/${id}/ledger`);
    return data;
  },
  async deactivate(id: number) {
    const { data } = await apiClient.patch<Account>(`${endpoints.accounts}/${id}/deactivate`);
    return data;
  },
};
