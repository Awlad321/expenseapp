import { documentDirectory, readAsStringAsync, writeAsStringAsync } from 'expo-file-system/legacy';
import type {
  Account,
  AccountLedger,
  AccountType,
  AuthResponse,
  Category,
  CategoryTag,
  CategoryType,
  CreditCard,
  CreditCardActivity,
  DashboardSummary,
  LedgerDirection,
  LedgerReferenceType,
  Transaction,
  TransactionType,
  Transfer,
  User,
} from '../../shared/types/api';

interface LocalUser extends User {
  password: string;
}

interface LocalDatabase {
  nextId: number;
  user: LocalUser | null;
  accounts: Account[];
  categories: Category[];
  transactions: Transaction[];
  transfers: Transfer[];
  ledger: AccountLedger[];
  creditCards: CreditCard[];
  creditCardActivities: CreditCardActivity[];
}

export interface AccountPayload {
  name: string;
  type: AccountType;
  openingBalance: number;
}

export interface CategoryPayload {
  name: string;
  type: CategoryType;
  tag?: CategoryTag;
  icon?: string | null;
  color?: string | null;
}

export interface UpdateCategoryPayload {
  name: string;
  tag?: CategoryTag;
  icon?: string | null;
  color?: string | null;
}

export interface TransactionPayload {
  accountId: number;
  categoryId: number;
  amount: number;
  transactionDate: string;
  note?: string;
}

export interface TransferPayload {
  fromAccountId: number;
  toAccountId: number;
  amount: number;
  feeAmount: number;
  transferDate: string;
  note?: string;
}

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

const dbPath = `${documentDirectory ?? ''}expensapp-standalone.json`;

const defaultCategories: Array<Pick<Category, 'name' | 'type' | 'defaultCategory'>> = [
  { name: 'Salary', type: 'INCOME', defaultCategory: true },
  { name: 'Bonus', type: 'INCOME', defaultCategory: true },
  { name: 'Freelance', type: 'INCOME', defaultCategory: true },
  { name: 'Gift', type: 'INCOME', defaultCategory: true },
  { name: 'Other', type: 'INCOME', defaultCategory: true },
  { name: 'Bills', type: 'EXPENSE', defaultCategory: true },
  { name: 'Basha', type: 'EXPENSE', defaultCategory: true },
  { name: 'Loan', type: 'EXPENSE', defaultCategory: true },
  { name: 'DPS', type: 'EXPENSE', defaultCategory: true },
  { name: 'Metro', type: 'EXPENSE', defaultCategory: true },
  { name: 'Protiva', type: 'EXPENSE', defaultCategory: true },
  { name: 'EBL CC', type: 'EXPENSE', defaultCategory: true },
  { name: 'Abbu', type: 'EXPENSE', defaultCategory: true },
  { name: 'Bkash loan', type: 'EXPENSE', defaultCategory: true },
  { name: 'Grocery', type: 'EXPENSE', defaultCategory: true },
];

export const localDatabase = {
  async exportBackup() {
    const db = await readDb();
    return JSON.stringify(db, null, 2);
  },

  async importBackup(raw: string) {
    const parsed = normalizeDb(JSON.parse(raw) as LocalDatabase);
    await writeDb(parsed);
  },

  async register(payload: { name: string; email: string; password: string }): Promise<AuthResponse> {
    const db = await readDb();
    const email = payload.email.trim().toLowerCase();
    const user = {
      id: 1,
      name: requiredName(payload.name, 'Name'),
      email,
      password: payload.password,
      createdAt: now(),
    };
    if (!email.includes('@')) throw new Error('Valid email is required');
    if (payload.password.length < 4) throw new Error('Password is too short');
    db.user = user;
    await writeDb(db);
    return toAuthResponse(user);
  },

  async login(payload: { email: string; password: string }): Promise<AuthResponse> {
    const db = await readDb();
    if (!db.user || db.user.email !== payload.email.trim().toLowerCase() || db.user.password !== payload.password) {
      throw new Error('Invalid email or password');
    }
    return toAuthResponse(db.user);
  },

  async me(): Promise<User> {
    const db = await readDb();
    if (!db.user) {
      throw new Error('No local user');
    }
    return stripPassword(db.user);
  },

  async listAccounts() {
    const db = await readDb();
    return [...db.accounts].sort((a, b) => a.name.localeCompare(b.name));
  },

  async createAccount(payload: AccountPayload) {
    return mutateDb((db) => {
      const name = requiredName(payload.name, 'Account name');
      if (db.accounts.some((account) => account.name.trim().toLowerCase() === name.toLowerCase())) {
        throw new Error('Account already exists');
      }
      const account: Account = {
        id: nextId(db),
        userId: 1,
        name,
        type: payload.type,
        openingBalance: nonNegative(payload.openingBalance),
        currentBalance: nonNegative(payload.openingBalance),
        active: true,
        createdAt: now(),
        updatedAt: now(),
      };
      db.accounts.push(account);
      if (account.openingBalance > 0) {
        addLedger(db, account, 'OPENING_BALANCE', account.id, 'CREDIT', account.openingBalance, 'Opening balance');
      }
      return account;
    });
  },

  async updateAccount(id: number, payload: AccountPayload) {
    return mutateDb((db) => {
      const account = getAccount(db, id);
      const name = requiredName(payload.name, 'Account name');
      if (db.accounts.some((item) => item.id !== id && item.name.trim().toLowerCase() === name.toLowerCase())) {
        throw new Error('Account already exists');
      }
      const openingBalance = nonNegative(payload.openingBalance);
      const delta = money(openingBalance - account.openingBalance);
      account.name = name;
      account.type = payload.type;
      account.openingBalance = openingBalance;
      account.updatedAt = now();
      if (delta > 0) {
        credit(db, account, delta, 'MANUAL_ADJUSTMENT', account.id, 'Opening balance increased');
      } else if (delta < 0) {
        debit(db, account, Math.abs(delta), 'MANUAL_ADJUSTMENT', account.id, 'Opening balance decreased');
      }
      return account;
    });
  },

  async deactivateAccount(id: number) {
    return mutateDb((db) => {
      const account = getAccount(db, id);
      account.active = false;
      account.updatedAt = now();
      return account;
    });
  },

  async listLedger(accountId: number) {
    const db = await readDb();
    getAccount(db, accountId);
    return db.ledger.filter((entry) => entry.accountId === accountId).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },

  async listCategories(type?: CategoryType, options?: { includeInactive?: boolean }) {
    const db = await readDb();
    return db.categories
      .filter((category) => !type || category.type === type)
      .filter((category) => options?.includeInactive ? true : category.active !== false)
      .sort((a, b) => Number(b.defaultCategory) - Number(a.defaultCategory) || a.name.localeCompare(b.name));
  },

  async createCategory(payload: CategoryPayload) {
    return mutateDb((db) => {
      const name = payload.name.trim();
      if (!name) {
        throw new Error('Category name is required');
      }
      const existing = db.categories.find((category) => categoryKey(category.name, category.type) === categoryKey(payload.name, payload.type));
      if (existing) return existing;

      const category: Category = {
        id: nextId(db),
        userId: 1,
        name,
        type: payload.type,
        tag: normalizeCategoryTag(payload.tag),
        icon: payload.icon ?? null,
        color: payload.color ?? null,
        defaultCategory: false,
        active: true,
        createdAt: now(),
      };
      db.categories.push(category);
      return category;
    });
  },

  async updateCategory(id: number, payload: UpdateCategoryPayload) {
    return mutateDb((db) => {
      const category = getCategoryById(db, id);
      const name = requiredCategoryName(payload.name);
      if (db.categories.some((item) => item.id !== id && item.type === category.type && categoryKey(item.name, item.type) === categoryKey(name, category.type))) {
        throw new Error('Category already exists');
      }

      category.name = name;
      category.tag = normalizeCategoryTag(payload.tag ?? category.tag);
      category.icon = payload.icon ?? category.icon ?? null;
      category.color = payload.color ?? category.color ?? null;

      db.transactions.forEach((transaction) => {
        if (transaction.categoryId === category.id) {
          transaction.categoryName = category.name;
          transaction.updatedAt = now();
        }
      });

      db.creditCardActivities.forEach((activity) => {
        if (activity.categoryId === category.id) {
          activity.categoryName = category.name;
        }
      });

      return category;
    });
  },

  async archiveCategory(id: number) {
    return mutateDb((db) => {
      const category = getCategoryById(db, id);
      if (category.defaultCategory) {
        throw new Error('Default categories cannot be archived');
      }
      category.active = false;
      return category;
    });
  },

  async mergeCategories(sourceId: number, targetId: number) {
    return mutateDb((db) => {
      const source = getCategoryById(db, sourceId);
      const target = getCategoryById(db, targetId);
      if (source.id === target.id) {
        throw new Error('Choose a different category to merge into');
      }
      if (source.type !== target.type) {
        throw new Error('Only categories of the same type can be merged');
      }

      db.transactions.forEach((transaction) => {
        if (transaction.categoryId === source.id) {
          transaction.categoryId = target.id;
          transaction.categoryName = target.name;
          transaction.updatedAt = now();
        }
      });

      db.creditCardActivities.forEach((activity) => {
        if (activity.categoryId === source.id) {
          activity.categoryId = target.id;
          activity.categoryName = target.name;
        }
      });

      source.active = false;
      return target;
    });
  },

  async listTransactions(params?: { type?: TransactionType; month?: string }) {
    const db = await readDb();
    return db.transactions
      .filter((transaction) => !params?.type || transaction.type === params.type)
      .filter((transaction) => !params?.month || transaction.transactionDate.startsWith(params.month))
      .sort(sortByDateDesc);
  },

  async getTransaction(id: number) {
    const db = await readDb();
    const transaction = db.transactions.find((item) => item.id === id);
    if (!transaction) throw new Error('Transaction not found');
    return transaction;
  },

  async createIncome(payload: TransactionPayload) {
    return createTransaction(payload, 'INCOME');
  },

  async createExpense(payload: TransactionPayload) {
    return createTransaction(payload, 'EXPENSE');
  },

  async updateTransaction(id: number, payload: TransactionPayload) {
    return mutateDb((db) => {
      const transaction = db.transactions.find((item) => item.id === id);
      if (!transaction) throw new Error('Transaction not found');
      if (transaction.relatedTransferId) {
        throw new Error('Transfer fee transactions are managed by transfer');
      }

      reverseTransaction(db, transaction);

      const account = getAccount(db, payload.accountId);
      const category = getCategory(db, payload.categoryId, transaction.type);
      transaction.accountId = account.id;
      transaction.accountName = account.name;
      transaction.categoryId = category.id;
      transaction.categoryName = category.name;
      transaction.amount = positive(payload.amount);
      transaction.transactionDate = validDate(payload.transactionDate);
      transaction.note = payload.note;
      transaction.updatedAt = now();

      if (transaction.type === 'INCOME') {
        credit(db, account, transaction.amount, 'INCOME', transaction.id, 'Income updated');
      } else {
        debit(db, account, transaction.amount, 'EXPENSE', transaction.id, 'Expense updated');
      }

      return transaction;
    });
  },

  async removeTransaction(id: number) {
    await mutateDb((db) => {
      const transaction = db.transactions.find((item) => item.id === id);
      if (!transaction) return null;
      if (transaction.relatedTransferId) {
        throw new Error('Transfer fee transactions are managed by transfer');
      }
      reverseTransaction(db, transaction);
      db.transactions = db.transactions.filter((item) => item.id !== id);
      return null;
    });
  },

  async listTransfers(month?: string) {
    const db = await readDb();
    return db.transfers
      .filter((transfer) => !month || transfer.transferDate.startsWith(month))
      .sort((a, b) => b.transferDate.localeCompare(a.transferDate) || b.createdAt.localeCompare(a.createdAt));
  },

  async getTransfer(id: number) {
    const db = await readDb();
    const transfer = db.transfers.find((item) => item.id === id);
    if (!transfer) throw new Error('Transfer not found');
    return transfer;
  },

  async listCreditCards() {
    const db = await readDb();
    return [...db.creditCards].sort((a, b) => a.name.localeCompare(b.name));
  },

  async createCreditCard(payload: CreditCardPayload) {
    return mutateDb((db) => {
      const name = requiredName(payload.name, 'Card name');
      if (db.creditCards.some((card) => card.name.trim().toLowerCase() === name.toLowerCase())) {
        throw new Error('Credit card already exists');
      }
      const card: CreditCard = {
        id: nextId(db),
        userId: 1,
        name,
        creditLimit: positive(payload.creditLimit),
        outstandingBalance: 0,
        billingDay: payload.billingDay ?? null,
        dueDay: payload.dueDay ?? null,
        active: true,
        createdAt: now(),
        updatedAt: now(),
      };
      db.creditCards.push(card);
      return card;
    });
  },

  async updateCreditCard(id: number, payload: CreditCardPayload) {
    return mutateDb((db) => {
      const card = getCreditCard(db, id);
      const name = requiredName(payload.name, 'Card name');
      if (db.creditCards.some((item) => item.id !== id && item.name.trim().toLowerCase() === name.toLowerCase())) {
        throw new Error('Credit card already exists');
      }
      const creditLimit = positive(payload.creditLimit);
      if (creditLimit < card.outstandingBalance) {
        throw new Error('Credit limit cannot be below outstanding balance');
      }

      card.name = name;
      card.creditLimit = creditLimit;
      card.billingDay = payload.billingDay ?? null;
      card.dueDay = payload.dueDay ?? null;
      card.updatedAt = now();

      db.creditCardActivities.forEach((activity) => {
        if (activity.cardId === card.id) {
          activity.cardName = card.name;
        }
      });

      return card;
    });
  },

  async spendWithCreditCard(payload: CreditCardSpendPayload) {
    return mutateDb((db) => {
      const card = getCreditCard(db, payload.cardId);
      const category = getCategory(db, payload.categoryId, 'EXPENSE');
      const amount = positive(payload.amount);
      ensureAvailableLimit(card, amount);
      card.outstandingBalance = money(card.outstandingBalance + amount);
      card.updatedAt = now();
      return addCreditCardActivity(db, card, {
        type: 'SPEND',
        categoryId: category.id,
        categoryName: category.name,
        amount,
        activityDate: validDate(payload.activityDate),
        note: payload.note,
      });
    });
  },

  async updateCreditCardActivity(
    id: number,
    payload: CreditCardSpendPayload | CreditCardPaymentPayload
  ) {
    return mutateDb((db) => {
      const activity = db.creditCardActivities.find((item) => item.id === id);
      if (!activity) throw new Error('Credit card activity not found');

      if (activity.type === 'SPEND') {
        const oldCard = getCreditCard(db, activity.cardId);
        oldCard.outstandingBalance = money(oldCard.outstandingBalance - activity.amount);
        oldCard.updatedAt = now();

        const nextPayload = payload as CreditCardSpendPayload;
        const nextCard = getCreditCard(db, nextPayload.cardId);
        const category = getCategory(db, nextPayload.categoryId, 'EXPENSE');
        const amount = positive(nextPayload.amount);
        ensureAvailableLimit(nextCard, amount);

        nextCard.outstandingBalance = money(nextCard.outstandingBalance + amount);
        nextCard.updatedAt = now();
        activity.cardId = nextCard.id;
        activity.cardName = nextCard.name;
        activity.categoryId = category.id;
        activity.categoryName = category.name;
        activity.amount = amount;
        activity.activityDate = validDate(nextPayload.activityDate);
        activity.balanceAfter = nextCard.outstandingBalance;
        activity.note = nextPayload.note;
        return activity;
      }

      const paymentPayload = payload as CreditCardPaymentPayload;
      const oldCard = getCreditCard(db, activity.cardId);
      oldCard.outstandingBalance = money(oldCard.outstandingBalance + activity.amount);
      oldCard.updatedAt = now();

      if (activity.sourceAccountId) {
        const oldAccount = getAccount(db, activity.sourceAccountId);
        credit(db, oldAccount, activity.amount, 'MANUAL_ADJUSTMENT', oldCard.id, `Reversal: credit card payment ${oldCard.name}`);
      }

      const nextCard = getCreditCard(db, paymentPayload.cardId);
      const nextAccount = getAccount(db, paymentPayload.sourceAccountId);
      const amount = positive(paymentPayload.amount);
      if (nextAccount.currentBalance < amount) {
        throw new Error('Insufficient source account balance');
      }
      if (nextCard.outstandingBalance < amount) {
        throw new Error('Payment cannot exceed outstanding debt');
      }

      nextCard.outstandingBalance = money(nextCard.outstandingBalance - amount);
      nextCard.updatedAt = now();
      debit(db, nextAccount, amount, 'MANUAL_ADJUSTMENT', nextCard.id, `Credit card payment: ${nextCard.name}`);

      activity.cardId = nextCard.id;
      activity.cardName = nextCard.name;
      activity.amount = amount;
      activity.activityDate = validDate(paymentPayload.activityDate);
      activity.sourceAccountId = nextAccount.id;
      activity.sourceAccountName = nextAccount.name;
      activity.balanceAfter = nextCard.outstandingBalance;
      activity.note = paymentPayload.note;
      return activity;
    });
  },

  async payCreditCard(payload: CreditCardPaymentPayload) {
    return mutateDb((db) => {
      const card = getCreditCard(db, payload.cardId);
      const account = getAccount(db, payload.sourceAccountId);
      const amount = positive(payload.amount);
      if (account.currentBalance < amount) {
        throw new Error('Insufficient source account balance');
      }
      if (card.outstandingBalance < amount) {
        throw new Error('Payment cannot exceed outstanding debt');
      }
      card.outstandingBalance = money(card.outstandingBalance - amount);
      card.updatedAt = now();
      debit(db, account, amount, 'MANUAL_ADJUSTMENT', card.id, `Credit card payment: ${card.name}`);
      return addCreditCardActivity(db, card, {
        type: 'PAYMENT',
        amount,
        activityDate: validDate(payload.activityDate),
        sourceAccountId: account.id,
        sourceAccountName: account.name,
        note: payload.note,
      });
    });
  },

  async listCreditCardActivities(cardId?: number) {
    const db = await readDb();
    return db.creditCardActivities
      .filter((activity) => !cardId || activity.cardId === cardId)
      .sort((a, b) => b.activityDate.localeCompare(a.activityDate) || b.createdAt.localeCompare(a.createdAt));
  },

  async createTransfer(payload: TransferPayload) {
    return mutateDb((db) => {
      const transfer: Transfer = {
        id: nextId(db),
        fromAccountId: 0,
        fromAccountName: '',
        toAccountId: 0,
        toAccountName: '',
        amount: 0,
        feeAmount: 0,
        transferDate: validDate(payload.transferDate),
        note: payload.note,
        createdAt: now(),
        updatedAt: now(),
      };
      db.transfers.push(transfer);
      applyTransfer(db, transfer, payload);
      return transfer;
    });
  },

  async updateTransfer(id: number, payload: TransferPayload) {
    return mutateDb((db) => {
      const transfer = db.transfers.find((item) => item.id === id);
      if (!transfer) throw new Error('Transfer not found');
      reverseTransfer(db, transfer);
      applyTransfer(db, transfer, payload);
      return transfer;
    });
  },

  async dashboardSummary(month: string): Promise<DashboardSummary> {
    const db = await readDb();
    const monthlyTransactions = db.transactions.filter((transaction) => transaction.transactionDate.startsWith(month));
    const today = todayValue();
    const todayExpenses = db.transactions
      .filter((transaction) => transaction.type === 'EXPENSE' && !transaction.relatedTransferId && transaction.transactionDate === today)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    const previousMonth = getPreviousMonth(month);
    const previousTransactions = db.transactions.filter((transaction) => transaction.transactionDate.startsWith(previousMonth));
    const totalIncome = sumByType(monthlyTransactions, 'INCOME');
    const totalExpense = sumByType(monthlyTransactions, 'EXPENSE');
    const totalBalance = money(db.accounts.filter((account) => account.active).reduce((sum, account) => sum + account.currentBalance, 0));
    const totalCreditCardDebt = money(db.creditCards.reduce((sum, card) => sum + card.outstandingBalance, 0));

    return {
      month,
      totalIncome,
      totalExpense,
      monthlySavings: money(totalIncome - totalExpense),
      totalBalance,
      remainingBalance: totalBalance,
      todayExpense: money(todayExpenses.reduce((sum, transaction) => sum + transaction.amount, 0)),
      todayExpenses,
      totalCreditCardDebt,
      netPosition: money(totalBalance - totalCreditCardDebt),
      previousMonthIncome: sumByType(previousTransactions, 'INCOME'),
      previousMonthExpense: sumByType(previousTransactions, 'EXPENSE'),
      accountBalances: db.accounts.filter((account) => account.active).map((account) => ({
        accountId: account.id,
        accountName: account.name,
        type: account.type,
        balance: account.currentBalance,
      })),
      expenseByCategory: getExpenseByCategory(monthlyTransactions),
      recentTransactions: [...db.transactions].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 8),
      recentTransfers: [...db.transfers].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 5),
    };
  },

  async exportCsv(month: string) {
    const transactions = await this.listTransactions({ month });
    const totalIncome = sumByType(transactions, 'INCOME');
    const totalExpense = sumByType(transactions, 'EXPENSE');
    const lines = [
      ['Report Month', month],
      ['Total Income', `${totalIncome}`],
      ['Total Expense', `${totalExpense}`],
      ['Net Savings', `${money(totalIncome - totalExpense)}`],
      [],
      ['Date', 'Type', 'Account', 'Category', 'Amount', 'Note'],
      ...transactions.map((transaction) => [
        transaction.transactionDate,
        transaction.type,
        transaction.accountName,
        transaction.categoryName,
        `${transaction.amount}`,
        transaction.note ?? '',
      ]),
    ];
    return lines.map((line) => line.map(escapeCsv).join(',')).join('\n');
  },
};

async function createTransaction(payload: TransactionPayload, type: TransactionType) {
  return mutateDb((db) => {
    const account = getAccount(db, payload.accountId);
    const category = getCategory(db, payload.categoryId, type);
    return addTransaction(db, {
      account,
      category,
      type,
      amount: positive(payload.amount),
      transactionDate: validDate(payload.transactionDate),
      note: payload.note,
      relatedTransferId: null,
      ledgerReferenceType: type,
    });
  });
}

function applyTransfer(db: LocalDatabase, transfer: Transfer, payload: TransferPayload) {
  if (payload.fromAccountId === payload.toAccountId) {
    throw new Error('Source and destination must be different');
  }

  const from = getAccount(db, payload.fromAccountId);
  const to = getAccount(db, payload.toAccountId);
  const amount = positive(payload.amount);
  const feeAmount = money(payload.feeAmount || 0);
  if (feeAmount < 0) throw new Error('Fee cannot be negative');
  if (from.currentBalance < amount + feeAmount) {
    throw new Error('Insufficient balance');
  }

  transfer.fromAccountId = from.id;
  transfer.fromAccountName = from.name;
  transfer.toAccountId = to.id;
  transfer.toAccountName = to.name;
  transfer.amount = amount;
  transfer.feeAmount = feeAmount;
  transfer.transferDate = validDate(payload.transferDate);
  transfer.note = payload.note;
  transfer.updatedAt = now();
  transfer.feeTransactionId = null;

  debit(db, from, amount, 'TRANSFER', transfer.id, `Transfer to ${to.name}`);
  credit(db, to, amount, 'TRANSFER', transfer.id, `Transfer from ${from.name}`);

  if (feeAmount > 0) {
    const category = getTransferFeeCategory(db);
    const feeTransaction = addTransaction(db, {
      account: from,
      category,
      type: 'EXPENSE',
      amount: feeAmount,
      transactionDate: transfer.transferDate,
      note: 'Transfer fee',
      relatedTransferId: transfer.id,
      ledgerReferenceType: 'TRANSFER_FEE',
    });
    transfer.feeTransactionId = feeTransaction.id;
  }
}

function addTransaction(
  db: LocalDatabase,
  input: {
    account: Account;
    category: Category;
    type: TransactionType;
    amount: number;
    transactionDate: string;
    note?: string;
    relatedTransferId?: number | null;
    ledgerReferenceType: LedgerReferenceType;
  }
) {
  const transaction: Transaction = {
    id: nextId(db),
    accountId: input.account.id,
    accountName: input.account.name,
    categoryId: input.category.id,
    categoryName: input.category.name,
    type: input.type,
    amount: money(input.amount),
    transactionDate: input.transactionDate,
    note: input.note,
    relatedTransferId: input.relatedTransferId,
    createdAt: now(),
    updatedAt: now(),
  };
  db.transactions.push(transaction);
  if (input.type === 'INCOME') {
    credit(db, input.account, transaction.amount, input.ledgerReferenceType, transaction.id, 'Income created');
  } else {
    debit(db, input.account, transaction.amount, input.ledgerReferenceType, transaction.id, input.ledgerReferenceType === 'TRANSFER_FEE' ? 'Transfer fee' : 'Expense created');
  }
  return transaction;
}

function reverseTransaction(db: LocalDatabase, transaction: Transaction) {
  const account = getAccount(db, transaction.accountId);
  const referenceType: LedgerReferenceType = transaction.relatedTransferId ? 'TRANSFER_FEE' : transaction.type;
  if (transaction.type === 'INCOME') {
    debit(db, account, transaction.amount, referenceType, transaction.id, 'Reversal: income');
  } else {
    credit(db, account, transaction.amount, referenceType, transaction.id, 'Reversal: expense');
  }
}

function reverseTransfer(db: LocalDatabase, transfer: Transfer) {
  const from = getAccount(db, transfer.fromAccountId);
  const to = getAccount(db, transfer.toAccountId);
  credit(db, from, transfer.amount, 'TRANSFER', transfer.id, `Reversal: transfer to ${transfer.toAccountName}`);
  debit(db, to, transfer.amount, 'TRANSFER', transfer.id, `Reversal: transfer from ${transfer.fromAccountName}`);

  if (transfer.feeTransactionId) {
    const feeTransaction = db.transactions.find((item) => item.id === transfer.feeTransactionId);
    if (feeTransaction) {
      reverseTransaction(db, feeTransaction);
      db.transactions = db.transactions.filter((item) => item.id !== feeTransaction.id);
    }
    transfer.feeTransactionId = null;
  }
}

async function readDb(): Promise<LocalDatabase> {
  if (!documentDirectory) {
    throw new Error('Local document storage is not available');
  }
  try {
    const raw = await readAsStringAsync(dbPath);
    return normalizeDb(JSON.parse(raw) as LocalDatabase);
  } catch {
    const db = createEmptyDb();
    await writeDb(db);
    return db;
  }
}

async function mutateDb<T>(mutation: (db: LocalDatabase) => T): Promise<T> {
  const db = await readDb();
  const result = mutation(db);
  await writeDb(db);
  return result;
}

async function writeDb(db: LocalDatabase) {
  await writeAsStringAsync(dbPath, JSON.stringify(db));
}

function createEmptyDb(): LocalDatabase {
  let next = 1;
  return {
    nextId: defaultCategories.length + 1,
    user: null,
    accounts: [],
    categories: defaultCategories.map((category) => ({
      id: next++,
      userId: null,
      name: category.name,
      type: category.type,
      icon: null,
      color: null,
      defaultCategory: category.defaultCategory,
      tag: 'GENERAL',
      active: true,
      createdAt: now(),
    })),
    transactions: [],
    transfers: [],
    ledger: [],
    creditCards: [],
    creditCardActivities: [],
  };
}

function normalizeDb(db: LocalDatabase): LocalDatabase {
  const normalized = {
    ...createEmptyDb(),
    ...db,
    categories: normalizeCategories(db.categories ?? [], db.nextId ?? 1),
    accounts: db.accounts ?? [],
    transactions: db.transactions ?? [],
    transfers: db.transfers ?? [],
    ledger: db.ledger ?? [],
    creditCards: db.creditCards ?? [],
    creditCardActivities: db.creditCardActivities ?? [],
  };
  normalized.nextId = Math.max(normalized.nextId ?? 1, maxExistingId(normalized) + 1);
  return normalized;
}

function normalizeCategories(existingCategories: Category[], fallbackNextId: number): Category[] {
  let next = Math.max(fallbackNextId, ...existingCategories.map((category) => category.id), defaultCategories.length) + 1;

  const normalizedDefaults: Category[] = defaultCategories.map((defaultCategory) => {
    const existing = existingCategories.find((category) => categoryKey(category.name, category.type) === categoryKey(defaultCategory.name, defaultCategory.type));
    if (existing) {
      return {
        ...existing,
        name: defaultCategory.name,
        type: defaultCategory.type,
        defaultCategory: true,
        tag: normalizeCategoryTag(existing.tag),
        active: existing.active ?? true,
      };
    }

    return {
      id: next++,
      userId: null,
      name: defaultCategory.name,
      type: defaultCategory.type,
      tag: 'GENERAL',
      icon: null,
      color: null,
      defaultCategory: true,
      active: true,
      createdAt: now(),
    };
  });

  const defaultKeys = new Set(defaultCategories.map((category) => categoryKey(category.name, category.type)));
  const customCategories: Category[] = existingCategories
    .filter((category) => !defaultKeys.has(categoryKey(category.name, category.type)))
    .filter((category, index, categories) => categories.findIndex((item) => categoryKey(item.name, item.type) === categoryKey(category.name, category.type)) === index)
    .map((category): Category => ({
      ...category,
      name: category.name.trim(),
      defaultCategory: false,
      tag: normalizeCategoryTag(category.tag),
      active: category.active ?? true,
    }))
    .filter((category) => category.name.length > 0);

  return [...normalizedDefaults, ...customCategories];
}

function categoryKey(name: string, type: CategoryType) {
  return `${type}:${name.trim().toLowerCase()}`;
}

function maxExistingId(db: LocalDatabase) {
  const ids = [
    db.user?.id ?? 0,
    ...db.accounts.map((item) => item.id),
    ...db.categories.map((item) => item.id),
    ...db.transactions.map((item) => item.id),
    ...db.transfers.map((item) => item.id),
    ...db.ledger.map((item) => item.id),
    ...db.creditCards.map((item) => item.id),
    ...db.creditCardActivities.map((item) => item.id),
  ];
  return Math.max(0, ...ids);
}

function nextId(db: LocalDatabase) {
  const id = db.nextId;
  db.nextId += 1;
  return id;
}

function getAccount(db: LocalDatabase, id: number) {
  const account = db.accounts.find((item) => item.id === id);
  if (!account) throw new Error('Account not found');
  return account;
}

function getCategory(db: LocalDatabase, id: number, type: CategoryType) {
  const category = db.categories.find((item) => item.id === id && item.type === type);
  if (!category) throw new Error('Category not found');
  return category;
}

function getCategoryById(db: LocalDatabase, id: number) {
  const category = db.categories.find((item) => item.id === id);
  if (!category) throw new Error('Category not found');
  return category;
}

function getTransferFeeCategory(db: LocalDatabase) {
  const category = db.categories.find((item) => item.type === 'EXPENSE' && item.name === 'Bills') ?? db.categories.find((item) => item.type === 'EXPENSE');
  if (!category) throw new Error('Expense category not found');
  return category;
}

function getCreditCard(db: LocalDatabase, id: number) {
  const card = db.creditCards.find((item) => item.id === id);
  if (!card) throw new Error('Credit card not found');
  return card;
}

function addCreditCardActivity(
  db: LocalDatabase,
  card: CreditCard,
  input: {
    type: CreditCardActivity['type'];
    amount: number;
    activityDate: string;
    sourceAccountId?: number | null;
    sourceAccountName?: string | null;
    categoryId?: number | null;
    categoryName?: string | null;
    note?: string;
  }
) {
  const activity: CreditCardActivity = {
    id: nextId(db),
    cardId: card.id,
    cardName: card.name,
    type: input.type,
    categoryId: input.categoryId ?? null,
    categoryName: input.categoryName ?? null,
    amount: money(input.amount),
    activityDate: input.activityDate,
    sourceAccountId: input.sourceAccountId ?? null,
    sourceAccountName: input.sourceAccountName ?? null,
    balanceAfter: card.outstandingBalance,
    note: input.note,
    createdAt: now(),
  };
  db.creditCardActivities.push(activity);
  return activity;
}

function ensureAvailableLimit(card: CreditCard, amount: number) {
  if (money(card.creditLimit - card.outstandingBalance) < amount) {
    throw new Error('Insufficient available credit limit');
  }
}

function credit(db: LocalDatabase, account: Account, amount: number, referenceType: LedgerReferenceType, referenceId: number, description: string) {
  account.currentBalance = money(account.currentBalance + amount);
  account.updatedAt = now();
  addLedger(db, account, referenceType, referenceId, 'CREDIT', amount, description);
}

function debit(db: LocalDatabase, account: Account, amount: number, referenceType: LedgerReferenceType, referenceId: number, description: string) {
  account.currentBalance = money(account.currentBalance - amount);
  account.updatedAt = now();
  addLedger(db, account, referenceType, referenceId, 'DEBIT', amount, description);
}

function addLedger(db: LocalDatabase, account: Account, referenceType: LedgerReferenceType, referenceId: number, direction: LedgerDirection, amount: number, description: string) {
  db.ledger.push({
    id: nextId(db),
    accountId: account.id,
    referenceType,
    referenceId,
    direction,
    amount: money(amount),
    balanceAfter: account.currentBalance,
    description,
    createdAt: now(),
  });
}

function toAuthResponse(user: LocalUser): AuthResponse {
  return {
    token: 'standalone-local-token',
    tokenType: 'Bearer',
    user: stripPassword(user),
  };
}

function stripPassword(user: LocalUser): User {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    createdAt: user.createdAt,
  };
}

function sumByType(transactions: Transaction[], type: TransactionType) {
  return money(transactions.filter((item) => item.type === type).reduce((sum, item) => sum + item.amount, 0));
}

function getExpenseByCategory(transactions: Transaction[]) {
  const sums = new Map<string, number>();
  transactions.filter((item) => item.type === 'EXPENSE').forEach((item) => {
    sums.set(item.categoryName, money((sums.get(item.categoryName) ?? 0) + item.amount));
  });
  return Array.from(sums.entries())
    .map(([category, amount]) => ({ category, amount }))
    .sort((a, b) => b.amount - a.amount);
}

function sortByDateDesc(a: Transaction, b: Transaction) {
  return b.transactionDate.localeCompare(a.transactionDate) || b.createdAt.localeCompare(a.createdAt);
}

function getPreviousMonth(month: string) {
  const [year, monthIndex] = month.split('-').map(Number);
  const date = new Date(year, monthIndex - 2, 1);
  return `${date.getFullYear()}-${`${date.getMonth() + 1}`.padStart(2, '0')}`;
}

function positive(value: number) {
  const amount = money(value);
  if (amount <= 0) throw new Error('Amount must be positive');
  return amount;
}

function nonNegative(value: number) {
  const amount = money(value);
  if (amount < 0) throw new Error('Amount cannot be negative');
  return amount;
}

function money(value: number) {
  const amount = Number(value);
  if (!Number.isFinite(amount)) throw new Error('Amount must be a valid number');
  return Math.round(amount * 100) / 100;
}

function requiredName(value: string, label: string) {
  const name = value.trim();
  if (name.length < 2) throw new Error(`${label} is required`);
  return name;
}

function requiredCategoryName(value: string) {
  return requiredName(value, 'Category name');
}

function normalizeCategoryTag(value?: CategoryTag) {
  if (value === 'FIXED' || value === 'ESSENTIAL' || value === 'DISCRETIONARY') {
    return value;
  }
  return 'GENERAL';
}

function validDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error('Valid date is required');
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw new Error('Valid date is required');
  return value;
}

function now() {
  return new Date().toISOString();
}

function todayValue() {
  return new Date().toISOString().slice(0, 10);
}

function escapeCsv(value: string) {
  const escaped = value.replace(/"/g, '""');
  return /[",\n\r]/.test(escaped) ? `"${escaped}"` : escaped;
}
