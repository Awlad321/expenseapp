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
  async create(payload: TransferPayload) {
    return localDatabase.createTransfer(payload);
  },
};
