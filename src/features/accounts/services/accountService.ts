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
