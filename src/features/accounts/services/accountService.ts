import { localDatabase } from '../../../services/api/localDatabase';
import type { AccountType } from '../../../shared/types/api';

export interface AccountPayload {
  name: string;
  type: AccountType;
  openingBalance: number;
}

export const accountService = {
  async list() {
    return localDatabase.listAccounts();
  },
  async get(id: number) {
    const accounts = await localDatabase.listAccounts();
    const account = accounts.find((item) => item.id === id);
    if (!account) throw new Error('Account not found');
    return account;
  },
  async create(payload: AccountPayload) {
    return localDatabase.createAccount(payload);
  },
  async update(id: number, payload: AccountPayload) {
    return localDatabase.updateAccount(id, payload);
  },
  async ledger(id: number) {
    return localDatabase.listLedger(id);
  },
  async deactivate(id: number) {
    return localDatabase.deactivateAccount(id);
  },
};
