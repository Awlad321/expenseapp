import { useCallback, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { DashboardStackParamList } from '../../../app/routes/types';
import { useAuth } from '../../../app/providers/AuthContext';
import { Card } from '../../../shared/components/Card';
import { AppText } from '../../../shared/components/AppText';
import { Header } from '../../../shared/components/Header';
import { PrimaryButton } from '../../../shared/components/PrimaryButton';
import { Screen } from '../../../shared/components/Screen';
import { colors, radius, spacing } from '../../../shared/theme/theme';
import { currentMonth, formatMoney } from '../../../shared/utils/format';
import type { DashboardSummary } from '../../../shared/types/api';
import { dashboardService } from '../services/dashboardService';

type Props = NativeStackScreenProps<DashboardStackParamList, 'DashboardHome'>;

const fallback: DashboardSummary = {
  month: currentMonth(),
  totalIncome: 0,
  totalExpense: 0,
  monthlySavings: 0,
  totalBalance: 0,
  previousMonthIncome: 0,
  previousMonthExpense: 0,
  accountBalances: [],
  expenseByCategory: [],
  recentTransactions: [],
  recentTransfers: [],
};

export function DashboardScreen({ navigation }: Props) {
  const { user, signOut } = useAuth();
  const [summary, setSummary] = useState<DashboardSummary>(fallback);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function load() {
    try {
      const data = await dashboardService.summary(currentMonth());
      setSummary(data);
    } catch {
      setSummary(fallback);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  async function refresh() {
    setRefreshing(true);
    await load();
  }

  useFocusEffect(useCallback(() => {
    load();
  }, []));

  if (loading) {
    return (
      <Screen scroll={false}>
        <View style={styles.center}><ActivityIndicator color={colors.primary} /></View>
      </Screen>
    );
  }

  return (
    <Screen style={styles.screen} refreshing={refreshing} onRefresh={refresh}>
      <Header title="Dashboard" subtitle={`Hi ${user?.name ?? 'there'}`} rightIcon="log-out-outline" onRightPress={signOut} />
      <LinearGradient colors={['#1B7A59', '#0E343B', '#111B23']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.balanceCard}>
        <View style={styles.heroTop}>
          <View>
            <AppText variant="small" style={styles.heroLabel}>Total portfolio</AppText>
            <AppText variant="title">{formatMoney(summary.totalBalance)}</AppText>
          </View>
          <View style={styles.monthPill}>
            <Ionicons name="calendar-outline" size={15} color={colors.text} />
            <AppText variant="small">{summary.month}</AppText>
          </View>
        </View>
        <View style={styles.balanceRow}>
          <Metric label="Usable" value={formatMoney(summary.totalBalance)} color={colors.income} />
          <Metric label="Card debt" value={formatMoney(summary.totalCreditCardDebt ?? 0)} color={colors.expense} />
          <Metric label="Net" value={formatMoney(summary.netPosition ?? summary.totalBalance)} color={colors.accent} />
        </View>
      </LinearGradient>

      <View style={styles.insightRow}>
        <InsightCard icon="analytics-outline" label="Savings rate" value={`${savingsRate(summary.totalIncome, summary.monthlySavings)}%`} tone={colors.accent} />
        <InsightCard icon="trending-up-outline" label="MoM expense" value={monthDelta(summary.previousMonthExpense, summary.totalExpense)} tone={summary.totalExpense > summary.previousMonthExpense ? colors.expense : colors.income} />
      </View>

      <View style={styles.quickRow}>
        <QuickAction icon="add-circle-outline" label="Income" color={colors.income} onPress={() => navigation.getParent()?.navigate('Transactions', { screen: 'AddIncome' })} />
        <QuickAction icon="remove-circle-outline" label="Expense" color={colors.expense} onPress={() => navigation.getParent()?.navigate('Transactions', { screen: 'AddExpense' })} />
        <QuickAction icon="swap-horizontal-outline" label="Transfer" color={colors.transfer} onPress={() => navigation.getParent()?.navigate('Transfer', { screen: 'AddTransfer' })} />
      </View>

      <Card>
        <SectionHeader title="Accounts" action="View all" />
        {summary.accountBalances.length === 0 ? <AppText muted>Add Cash, Bank, or Wallet accounts to see balances.</AppText> : summary.accountBalances.map((account) => (
          <View key={account.accountId} style={styles.accountTile}>
            <View style={styles.rowLeft}>
              <View style={styles.accountIcon}>
                <Ionicons name={account.type === 'BANK' ? 'business-outline' : account.type === 'CASH' ? 'cash-outline' : 'wallet-outline'} size={20} color={accountColor(account.type)} />
              </View>
              <View>
                <AppText>{account.accountName}</AppText>
                <AppText variant="small" muted>{account.type}</AppText>
              </View>
            </View>
            <AppText>{formatMoney(account.balance)}</AppText>
          </View>
        ))}
      </Card>

      <Card>
        <SectionHeader title="Expense categories" />
        {summary.expenseByCategory.length === 0 ? <AppText muted>No spending in this month yet.</AppText> : summary.expenseByCategory.map((item) => (
          <CategoryBar key={item.category} label={item.category} amount={item.amount} max={Math.max(...summary.expenseByCategory.map((category) => category.amount), 1)} />
        ))}
      </Card>

      <Card>
        <SectionHeader title="Recent activity" />
        {summary.recentTransactions.slice(0, 5).map((item) => (
          <View key={item.id} style={styles.listRow}>
            <View style={styles.rowLeft}>
              <View style={[styles.activityIcon, { backgroundColor: item.type === 'INCOME' ? 'rgba(54,211,153,0.13)' : 'rgba(255,122,122,0.13)' }]}>
                <Ionicons name={item.type === 'INCOME' ? 'arrow-down-left-box' : 'arrow-up-right-box'} size={18} color={item.type === 'INCOME' ? colors.income : colors.expense} />
              </View>
              <View>
                <AppText>{item.categoryName}</AppText>
                <AppText variant="small" muted>{item.accountName}</AppText>
              </View>
            </View>
            <View style={styles.amountBlock}>
              <AppText style={{ color: item.type === 'INCOME' ? colors.income : colors.expense }}>
                {item.type === 'INCOME' ? '+' : '-'}{formatMoney(item.amount)}
              </AppText>
              <AppText variant="small" muted>{item.transactionDate}</AppText>
            </View>
          </View>
        ))}
        {summary.recentTransactions.length === 0 ? <AppText muted>No recent transactions.</AppText> : null}
      </Card>
    </Screen>
  );
}

function SectionHeader({ title, action }: { title: string; action?: string }) {
  return (
    <View style={styles.sectionHeader}>
      <AppText variant="h2">{title}</AppText>
      {action ? <AppText variant="small" style={styles.actionText}>{action}</AppText> : null}
    </View>
  );
}

function InsightCard({ icon, label, value, tone }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string; tone: string }) {
  return (
    <View style={styles.insightCard}>
      <View style={[styles.insightIcon, { backgroundColor: `${tone}20` }]}>
        <Ionicons name={icon} size={18} color={tone} />
      </View>
      <View style={styles.insightCopy}>
        <AppText variant="small" muted>{label}</AppText>
        <AppText>{value}</AppText>
      </View>
    </View>
  );
}

function CategoryBar({ label, amount, max }: { label: string; amount: number; max: number }) {
  return (
    <View style={styles.categoryBar}>
      <View style={styles.listRow}>
        <AppText>{label}</AppText>
        <AppText style={{ color: colors.expense }}>{formatMoney(amount)}</AppText>
      </View>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${Math.max((amount / max) * 100, 4)}%` }]} />
      </View>
    </View>
  );
}

function Metric({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <View style={styles.metric}>
      <AppText variant="small" muted>{label}</AppText>
      <AppText style={{ color }}>{value}</AppText>
    </View>
  );
}

function QuickAction({ icon, label, color, onPress }: { icon: keyof typeof Ionicons.glyphMap; label: string; color: string; onPress: () => void }) {
  return (
    <PrimaryButton variant="ghost" onPress={onPress} style={styles.quickButton}>
      <View style={styles.quickContent}>
        <Ionicons name={icon} size={22} color={color} />
        <AppText variant="small">{label}</AppText>
      </View>
    </PrimaryButton>
  );
}

function savingsRate(income: number, savings: number) {
  if (income <= 0) return 0;
  return Math.round((savings / income) * 100);
}

function monthDelta(previous: number, current: number) {
  if (previous <= 0 && current <= 0) return '0%';
  if (previous <= 0) return '+100%';
  const delta = Math.round(((current - previous) / previous) * 100);
  return `${delta > 0 ? '+' : ''}${delta}%`;
}

function accountColor(type: string) {
  if (type === 'BANK') return colors.bank;
  if (type === 'CASH') return colors.cash;
  if (type === 'WALLET') return colors.wallet;
  return colors.primary;
}

const styles = StyleSheet.create({
  screen: {
    paddingBottom: spacing.xxl,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  balanceCard: {
    borderRadius: radius.xl,
    padding: spacing.xl,
    gap: spacing.lg,
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  heroTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  heroLabel: {
    color: 'rgba(244,251,248,0.74)',
  },
  monthPill: {
    height: 34,
    borderRadius: 17,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.xs,
    backgroundColor: 'rgba(255,255,255,0.10)',
  },
  balanceRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  metric: {
    flex: 1,
    gap: spacing.xs,
    borderRadius: radius.md,
    padding: spacing.md,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  insightRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  insightCard: {
    flex: 1,
    minHeight: 72,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.cardGlass,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  insightIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  insightCopy: {
    flex: 1,
    gap: spacing.xs,
  },
  quickRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  quickButton: {
    flex: 1,
    minHeight: 68,
    borderRadius: radius.lg,
  },
  quickContent: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  actionText: {
    color: colors.primary,
  },
  accountTile: {
    borderRadius: radius.md,
    padding: spacing.md,
    backgroundColor: colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  accountIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceMuted,
  },
  activityIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  amountBlock: {
    alignItems: 'flex-end',
    gap: spacing.xs,
  },
  categoryBar: {
    gap: spacing.sm,
  },
  track: {
    height: 8,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: colors.surfaceMuted,
  },
  fill: {
    height: 8,
    borderRadius: 8,
    backgroundColor: colors.expense,
  },
});
