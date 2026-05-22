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
  AddIncome: undefined;
  AddExpense: undefined;
};

export type TransfersStackParamList = {
  TransferList: undefined;
  AddTransfer: undefined;
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

export type AppTabParamList = {
  Dashboard: NavigatorScreenParams<DashboardStackParamList>;
  Transactions: NavigatorScreenParams<TransactionsStackParamList>;
  Transfer: NavigatorScreenParams<TransfersStackParamList>;
  Accounts: NavigatorScreenParams<AccountsStackParamList>;
  Cards: NavigatorScreenParams<CreditCardsStackParamList>;
  Reports: NavigatorScreenParams<ReportsStackParamList>;
};
