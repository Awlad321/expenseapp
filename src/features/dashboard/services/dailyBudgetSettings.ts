import * as SecureStore from 'expo-secure-store';

interface DailyBudgetSettings {
  cycleStartDay?: number;
}

const storageKey = 'expensapp.dashboard.daily-budget-settings';

export async function getDailyBudgetSettings(): Promise<DailyBudgetSettings> {
  const value = await SecureStore.getItemAsync(storageKey);
  if (!value) {
    return {};
  }

  try {
    const parsed = JSON.parse(value) as Partial<DailyBudgetSettings>;
    return {
      cycleStartDay: typeof parsed.cycleStartDay === 'number' ? parsed.cycleStartDay : undefined,
    };
  } catch {
    return {};
  }
}

export async function saveDailyBudgetSettings(cycleStartDay: number) {
  await SecureStore.setItemAsync(storageKey, JSON.stringify({ cycleStartDay }));
}
