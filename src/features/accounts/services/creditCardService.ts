import { localDatabase } from '../../../services/api/localDatabase';

export interface CreditCardPayload {
  name: string;
  creditLimit: number;
  billingDay?: number | null;
  dueDay?: number | null;
}

export interface CreditCardSpendPayload {
  cardId: number;
  categoryId: number;
  amount: number;
  activityDate: string;
  note?: string;
}

export interface CreditCardPaymentPayload {
  cardId: number;
  sourceAccountId: number;
  amount: number;
  activityDate: string;
  note?: string;
}

export interface CreditCardEmiPayload {
  cardId: number;
  mode: 'LIVE' | 'BACKFILL';
  title: string;
  merchantName?: string;
  originalAmount: number;
  installmentAmount: number;
  totalInstallments: number;
  startDate: string;
  dueDate?: string;
  note?: string;
}

export interface CreditCardEmiPaymentPayload {
  emiId: number;
  amount: number;
  affectsOutstanding: boolean;
  paymentDate: string;
  note?: string;
}

export const creditCardService = {
  list() {
    return localDatabase.listCreditCards();
  },
  create(payload: CreditCardPayload) {
    return localDatabase.createCreditCard(payload);
  },
  update(id: number, payload: CreditCardPayload) {
    return localDatabase.updateCreditCard(id, payload);
  },
  remove(id: number) {
    return localDatabase.deleteCreditCard(id);
  },
  spend(payload: CreditCardSpendPayload) {
    return localDatabase.spendWithCreditCard(payload);
  },
  pay(payload: CreditCardPaymentPayload) {
    return localDatabase.payCreditCard(payload);
  },
  updateActivity(id: number, payload: CreditCardSpendPayload | CreditCardPaymentPayload) {
    return localDatabase.updateCreditCardActivity(id, payload);
  },
  activities(cardId?: number) {
    return localDatabase.listCreditCardActivities(cardId);
  },
  emis(cardId?: number) {
    return localDatabase.listCreditCardEmis(cardId);
  },
  createEmi(payload: CreditCardEmiPayload) {
    return localDatabase.createCreditCardEmi(payload);
  },
  updateEmi(id: number, payload: CreditCardEmiPayload) {
    return localDatabase.updateCreditCardEmi(id, payload);
  },
  removeEmi(id: number) {
    return localDatabase.deleteCreditCardEmi(id);
  },
  emiPayments(emiId?: number) {
    return localDatabase.listCreditCardEmiPayments(emiId);
  },
  createEmiPayment(payload: CreditCardEmiPaymentPayload) {
    return localDatabase.addCreditCardEmiPayment(payload);
  },
  updateEmiPayment(id: number, payload: CreditCardEmiPaymentPayload) {
    return localDatabase.updateCreditCardEmiPayment(id, payload);
  },
  removeEmiPayment(id: number) {
    return localDatabase.deleteCreditCardEmiPayment(id);
  },
};
