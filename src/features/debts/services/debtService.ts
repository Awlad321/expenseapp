import { localDatabase } from '../../../services/api/localDatabase';

export interface DebtPayload {
  kind: 'BORROWED' | 'LENT';
  personName: string;
  phoneNumber?: string;
  description?: string;
  totalAmount: number;
  borrowDate: string;
  dueDate?: string;
  interestNote?: string;
  tag?: string;
}

export interface DebtPaymentPayload {
  debtId: number;
  amount: number;
  paymentDate: string;
  note?: string;
}

export const debtService = {
  list() {
    return localDatabase.listDebts();
  },
  get(id: number) {
    return localDatabase.getDebt(id);
  },
  create(payload: DebtPayload) {
    return localDatabase.createDebt(payload);
  },
  update(id: number, payload: DebtPayload) {
    return localDatabase.updateDebt(id, payload);
  },
  remove(id: number) {
    return localDatabase.removeDebt(id);
  },
  listPayments(debtId?: number) {
    return localDatabase.listDebtPayments(debtId);
  },
  createPayment(payload: DebtPaymentPayload) {
    return localDatabase.createDebtPayment(payload);
  },
  updatePayment(id: number, payload: DebtPaymentPayload) {
    return localDatabase.updateDebtPayment(id, payload);
  },
  removePayment(id: number) {
    return localDatabase.removeDebtPayment(id);
  },
};
