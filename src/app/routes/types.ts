import type { NavigatorScreenParams } from '@react-navigation/native';

export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
};

export type DashboardStackParamList = {
  DashboardHome: undefined;
};

export type TransactionsStackParamList = {
  TransactionList: undefined;
  AddIncome: { transactionId?: number; duplicateTransactionId?: number } | undefined;
  AddExpense: { transactionId?: number; duplicateTransactionId?: number } | undefined;
  ManageCategories: { type?: 'INCOME' | 'EXPENSE' } | undefined;
};

export type TransfersStackParamList = {
  TransferList: undefined;
  AddTransfer: { transferId?: number } | undefined;
};

export type AccountsStackParamList = {
  AccountsHome: undefined;
  AddEditAccount: { accountId?: number } | undefined;
  AccountLedger: { accountId: number; accountName: string };
};

export type ReportsStackParamList = {
  ReportsHome: undefined;
};

export type CreditCardsStackParamList = {
  CreditCardsHome: undefined;
};

export type DebtsStackParamList = {
  DebtsHome: undefined;
  AddEditDebt: { debtId?: number } | undefined;
  DebtDetails: { debtId: number };
};

export type AppTabParamList = {
  Dashboard: NavigatorScreenParams<DashboardStackParamList>;
  Transactions: NavigatorScreenParams<TransactionsStackParamList>;
  Transfer: NavigatorScreenParams<TransfersStackParamList>;
  Accounts: NavigatorScreenParams<AccountsStackParamList>;
  Debts: NavigatorScreenParams<DebtsStackParamList>;
  Cards: NavigatorScreenParams<CreditCardsStackParamList>;
  Reports: NavigatorScreenParams<ReportsStackParamList>;
};
