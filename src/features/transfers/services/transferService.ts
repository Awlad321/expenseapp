import { localDatabase } from '../../../services/api/localDatabase';

export interface TransferPayload {
  fromAccountId: number;
  toAccountId: number;
  amount: number;
  feeAmount: number;
  transferDate: string;
  note?: string;
}

export const transferService = {
  async list(month?: string) {
    return localDatabase.listTransfers(month);
  },
  async get(id: number) {
    return localDatabase.getTransfer(id);
  },
  async create(payload: TransferPayload) {
    return localDatabase.createTransfer(payload);
  },
  async update(id: number, payload: TransferPayload) {
    return localDatabase.updateTransfer(id, payload);
  },
};
