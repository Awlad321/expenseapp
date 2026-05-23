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

export const creditCardService = {
  list() {
    return localDatabase.listCreditCards();
  },
  create(payload: CreditCardPayload) {
    return localDatabase.createCreditCard(payload);
  },
  spend(payload: CreditCardSpendPayload) {
    return localDatabase.spendWithCreditCard(payload);
  },
  pay(payload: CreditCardPaymentPayload) {
    return localDatabase.payCreditCard(payload);
  },
  activities(cardId?: number) {
    return localDatabase.listCreditCardActivities(cardId);
  },
};
