export type AccountType = 'CASH' | 'BANK' | 'WALLET' | 'OTHER';
export type CategoryType = 'INCOME' | 'EXPENSE';
export type TransactionType = 'INCOME' | 'EXPENSE';
export type LedgerDirection = 'CREDIT' | 'DEBIT';
export type LedgerReferenceType = 'INCOME' | 'EXPENSE' | 'TRANSFER' | 'TRANSFER_FEE' | 'OPENING_BALANCE' | 'MANUAL_ADJUSTMENT';
export type CreditCardActivityType = 'SPEND' | 'PAYMENT' | 'ADJUSTMENT';

export interface User {
  id: number;
  name: string;
  email: string;
  createdAt: string;
}

export interface AuthResponse {
  token: string;
  tokenType: string;
  user: User;
}

export interface Account {
  id: number;
  userId: number;
  name: string;
  type: AccountType;
  openingBalance: number;
  currentBalance: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AccountLedger {
  id: number;
  accountId: number;
  referenceType: LedgerReferenceType;
  referenceId?: number | null;
  direction: LedgerDirection;
  amount: number;
  balanceAfter: number;
  description?: string | null;
  createdAt: string;
}

export interface CreditCard {
  id: number;
  userId: number;
  name: string;
  creditLimit: number;
  outstandingBalance: number;
  billingDay?: number | null;
  dueDay?: number | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreditCardActivity {
  id: number;
  cardId: number;
  cardName: string;
  type: CreditCardActivityType;
  categoryId?: number | null;
  categoryName?: string | null;
  amount: number;
  activityDate: string;
  sourceAccountId?: number | null;
  sourceAccountName?: string | null;
  balanceAfter: number;
  note?: string | null;
  createdAt: string;
}

export interface Category {
  id: number;
  userId: number | null;
  name: string;
  type: CategoryType;
  icon?: string | null;
  color?: string | null;
  defaultCategory: boolean;
  createdAt: string;
}

export interface Transaction {
  id: number;
  accountId: number;
  accountName: string;
  categoryId: number;
  categoryName: string;
  type: TransactionType;
  amount: number;
  transactionDate: string;
  note?: string | null;
  relatedTransferId?: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface Transfer {
  id: number;
  fromAccountId: number;
  fromAccountName: string;
  toAccountId: number;
  toAccountName: string;
  amount: number;
  feeAmount: number;
  feeTransactionId?: number | null;
  transferDate: string;
  note?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DashboardSummary {
  month: string;
  totalIncome: number;
  totalExpense: number;
  monthlySavings: number;
  totalBalance: number;
  totalCreditCardDebt?: number;
  netPosition?: number;
  previousMonthIncome: number;
  previousMonthExpense: number;
  accountBalances: Array<{ accountId: number; accountName: string; type: string; balance: number }>;
  expenseByCategory: Array<{ category: string; amount: number }>;
  recentTransactions: Transaction[];
  recentTransfers: Transfer[];
}
