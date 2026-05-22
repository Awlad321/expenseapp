import * as SecureStore from 'expo-secure-store';
import type { TransactionType } from '../../../shared/types/api';

interface TransactionPreference {
  accountId?: number;
  categoryIds: number[];
  amounts: string[];
}

const maxRecentItems = 5;

function key(type: TransactionType) {
  return `expensapp.transaction-preferences.${type.toLowerCase()}`;
}

export async function getTransactionPreference(type: TransactionType): Promise<TransactionPreference> {
  const value = await SecureStore.getItemAsync(key(type));
  if (!value) {
    return { categoryIds: [], amounts: [] };
  }

  try {
    const parsed = JSON.parse(value) as Partial<TransactionPreference>;
    return {
      accountId: typeof parsed.accountId === 'number' ? parsed.accountId : undefined,
      categoryIds: Array.isArray(parsed.categoryIds) ? parsed.categoryIds.filter((id) => typeof id === 'number') : [],
      amounts: Array.isArray(parsed.amounts) ? parsed.amounts.filter((amount) => typeof amount === 'string') : [],
    };
  } catch {
    return { categoryIds: [], amounts: [] };
  }
}

export async function saveTransactionPreference(type: TransactionType, values: { accountId: number; categoryId: number; amount: string }) {
  const current = await getTransactionPreference(type);
  const amount = normalizeAmount(values.amount);
  const next: TransactionPreference = {
    accountId: values.accountId,
    categoryIds: uniqueRecent([values.categoryId, ...current.categoryIds]),
    amounts: amount ? uniqueRecent([amount, ...current.amounts]) : current.amounts,
  };

  await SecureStore.setItemAsync(key(type), JSON.stringify(next));
}

function uniqueRecent<T>(items: T[]) {
  return Array.from(new Set(items)).slice(0, maxRecentItems);
}

function normalizeAmount(value: string) {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount <= 0) {
    return '';
  }
  return `${amount}`;
}
