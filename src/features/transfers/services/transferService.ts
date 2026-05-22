import { apiClient } from '../../../services/api/apiClient';
import { endpoints } from '../../../services/api/endpoints';
import type { Transfer } from '../../../shared/types/api';

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
    const { data } = await apiClient.get<Transfer[]>(endpoints.transfers, { params: { month } });
    return data;
  },
  async create(payload: TransferPayload) {
    const { data } = await apiClient.post<Transfer>(endpoints.transfers, payload);
    return data;
  },
};
