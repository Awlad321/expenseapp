import { useCallback, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { DashboardStackParamList } from '../../../app/routes/types';
import { useAuth } from '../../../app/providers/AuthContext';
import { AppText } from '../../../shared/components/AppText';
import { Card } from '../../../shared/components/Card';
import { Header } from '../../../shared/components/Header';
import { PrimaryButton } from '../../../shared/components/PrimaryButton';
import { Screen } from '../../../shared/components/Screen';
import { colors, radius, spacing } from '../../../shared/theme/theme';
import { useTheme } from '../../../shared/theme/ThemeContext';
import { currentMonth, formatMoney } from '../../../shared/utils/format';
import type { DashboardSummary } from '../../../shared/types/api';
import { dashboardService } from '../services/dashboardService';
import { useResponsiveLayout } from '../../../shared/layout/responsive';

type Props = NativeStackScreenProps<DashboardStackParamList, 'DashboardHome'>;

const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

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
  const theme = useTheme();
  const layout = useResponsiveLayout();
  const [selectedMonth, setSelectedMonth] = useState(currentMonth());
  const [monthPickerVisible, setMonthPickerVisible] = useState(false);
  const [pickerYear, setPickerYear] = useState(() => Number(currentMonth().slice(0, 4)));
  const [summary, setSummary] = useState<DashboardSummary>(fallback);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function load(month = selectedMonth) {
    try {
      const data = await dashboardService.summary(month);
      setSummary(data);
    } catch {
      setSummary({ ...fallback, month });
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
  }, [selectedMonth]));

  async function selectMonth(month: string) {
    setSelectedMonth(month);
    setMonthPickerVisible(false);
    setLoading(true);
    await load(month);
  }

  function openMonthPicker() {
    setPickerYear(Number(selectedMonth.slice(0, 4)));
    setMonthPickerVisible(true);
  }

  if (loading) {
    return (
      <Screen scroll={false}>
        <View style={styles.center}><ActivityIndicator color={colors.primary} /></View>
      </Screen>
    );
  }

  return (
    <Screen style={styles.screen} refreshing={refreshing} onRefresh={refresh}>
      <Header title="Home" subtitle={`Hi ${user?.name ?? 'there'}`} rightIcon="log-out-outline" onRightPress={signOut} />
      <LinearGradient
        colors={theme.scheme === 'dark' ? ['#1B7A59', '#0E343B', '#111B23'] : ['#DDFBF0', '#BFEFE0', '#F8FFFC']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.balanceCard, { padding: layout.compact ? spacing.lg : spacing.xl, gap: layout.compact ? spacing.md : spacing.lg, borderColor: theme.colors.borderStrong }]}
      >
        <View style={styles.heroTop}>
          <View>
            <AppText variant="small" style={{ color: theme.scheme === 'dark' ? 'rgba(244,251,248,0.74)' : theme.colors.textMuted }}>Remaining</AppText>
            <AppText variant="title">{formatMoney(summary.remainingBalance ?? summary.totalBalance)}</AppText>
          </View>
          <Pressable onPress={openMonthPicker} style={[styles.monthPill, { minHeight: layout.compact ? 30 : 34, backgroundColor: theme.scheme === 'dark' ? 'rgba(255,255,255,0.10)' : 'rgba(20,158,110,0.12)' }]}>
            <Ionicons name="calendar-outline" size={15} color={theme.colors.text} />
            <AppText variant="small">{formatMonthLabel(summary.month)}</AppText>
            <Ionicons name="chevron-down" size={14} color={theme.colors.text} />
          </Pressable>
        </View>
        <View style={styles.balanceRow}>
          <Metric label="Income" value={formatMoney(summary.totalIncome)} color={theme.colors.income} backgroundColor={theme.scheme === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.72)'} />
          <Metric label="Expense" value={formatMoney(summary.totalExpense)} color={theme.colors.expense} backgroundColor={theme.scheme === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.72)'} />
        </View>
        <View style={styles.balanceRow}>
          <Metric label="Today's Expense" value={formatMoney(summary.todayExpense ?? 0)} color={theme.colors.expense} backgroundColor={theme.scheme === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.72)'} />
          <Metric label="Remaining" value={formatMoney(summary.remainingBalance ?? summary.totalBalance)} color={theme.colors.accent} backgroundColor={theme.scheme === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.72)'} />
        </View>
      </LinearGradient>

      <View style={styles.quickRow}>
        <QuickAction
          icon="remove-circle-outline"
          label="Expense"
          color={theme.colors.background}
          backgroundColor={theme.colors.primary}
          filled
          onPress={() => navigation.getParent()?.navigate('Transactions', { screen: 'AddExpense' })}
        />
        <QuickAction icon="add-circle-outline" label="Income" color={theme.colors.income} onPress={() => navigation.getParent()?.navigate('Transactions', { screen: 'AddIncome' })} />
        <QuickAction icon="swap-horizontal-outline" label="Move" color={theme.colors.transfer} onPress={() => navigation.getParent()?.navigate('Transfer', { screen: 'AddTransfer' })} />
      </View>

      <Card>
        <SectionHeader title="Accounts" action="View all" onAction={() => navigation.getParent()?.navigate('Accounts', { screen: 'AccountsHome' })} />
        {summary.accountBalances.length === 0 ? <AppText muted>Add Cash, Bank, or Wallet accounts to see balances.</AppText> : (
          <View style={styles.accountSummaryGrid}>
            {buildAccountSummary(summary).map((item) => (
              <View key={item.type} style={[styles.accountSummaryTile, { minWidth: layout.compact ? 132 : 148, backgroundColor: theme.colors.surface }]}>
                <View style={styles.accountSummaryTop}>
                  <View style={[styles.accountBadge, { width: layout.compact ? 24 : 28, height: layout.compact ? 24 : 28, borderRadius: layout.compact ? 12 : 14, backgroundColor: theme.colors.surfaceMuted }]}>
                    <Ionicons name={item.type === 'BANK' ? 'business-outline' : item.type === 'CASH' ? 'cash-outline' : item.type === 'WALLET' ? 'wallet-outline' : 'layers-outline'} size={15} color={accountColor(item.type, theme.colors)} />
                  </View>
                  <AppText variant="small" muted>{item.label}</AppText>
                </View>
                <AppText>{formatMoney(item.balance)}</AppText>
              </View>
            ))}
          </View>
        )}
      </Card>

      <Card>
        <SectionHeader title="Cards" action="Open cards" onAction={() => navigation.getParent()?.navigate('Cards', { screen: 'CreditCardsHome' })} />
        <View style={styles.balanceRow}>
          <Metric
            label="Outstanding"
            value={formatMoney(summary.totalCreditCardDebt ?? 0)}
            color={theme.colors.expense}
            backgroundColor={theme.colors.surface}
          />
          <Metric
            label="Remaining limit"
            value={formatMoney(summary.totalCreditCardRemaining ?? 0)}
            color={theme.colors.accent}
            backgroundColor={theme.colors.surface}
          />
        </View>
      </Card>

      <Card>
        <SectionHeader title="Today's expenses" />
        {(summary.todayExpenses ?? []).map((item) => (
          <Pressable
            key={item.id}
            onPress={() => navigation.getParent()?.navigate('Transactions', { screen: 'AddExpense', params: { transactionId: item.id } })}
            style={styles.listRow}
          >
            <View style={styles.rowLeft}>
              <View style={[styles.activityIcon, { backgroundColor: 'rgba(255,122,122,0.13)' }]}>
                <Ionicons name="arrow-up-right-box" size={18} color={colors.expense} />
              </View>
              <View style={styles.todayCopy}>
                <AppText>{item.categoryName}</AppText>
                <AppText variant="small" muted>{item.accountName}</AppText>
                {item.note ? <AppText variant="small" muted>{item.note}</AppText> : null}
              </View>
            </View>
            <View style={styles.amountBlock}>
              <AppText style={{ color: colors.expense }}>
                -{formatMoney(item.amount)}
              </AppText>
              <AppText variant="small" muted>{formatCreatedAt(item.createdAt)}</AppText>
            </View>
          </Pressable>
        ))}
        {(summary.todayExpenses ?? []).length === 0 ? <AppText muted>No expenses added today</AppText> : null}
      </Card>

      <Card>
        <SectionHeader title="Recent changes" action="Transactions" onAction={() => navigation.getParent()?.navigate('Transactions', { screen: 'TransactionList' })} />
        {buildRecentFeed(summary).map((item) => (
          <Pressable
            key={`${item.kind}-${item.id}`}
            style={styles.listRow}
            onPress={() => {
              if (item.kind === 'TRANSFER') {
                navigation.getParent()?.navigate('Transfer', { screen: 'AddTransfer', params: { transferId: item.id } });
                return;
              }
              navigation.getParent()?.navigate('Transactions', {
                screen: item.kind === 'INCOME' ? 'AddIncome' : 'AddExpense',
                params: { transactionId: item.id },
              });
            }}
          >
            <View style={styles.rowLeft}>
              <View style={[styles.activityIcon, { backgroundColor: `${item.accent}20` }]}>
                <Ionicons name={item.icon} size={18} color={item.accent} />
              </View>
              <View style={styles.todayCopy}>
                <AppText>{item.title}</AppText>
                <AppText variant="small" muted>{item.subtitle}</AppText>
              </View>
            </View>
            <View style={styles.amountBlock}>
              <AppText style={{ color: item.accent }}>{item.amountLabel}</AppText>
              <AppText variant="small" muted>{item.when}</AppText>
            </View>
          </Pressable>
        ))}
        {buildRecentFeed(summary).length === 0 ? <AppText muted>No recent entries yet.</AppText> : null}
      </Card>

      <Card>
        <SectionHeader title="Top drains this month" action="Insights" onAction={() => navigation.getParent()?.navigate('Reports', { screen: 'ReportsHome' })} />
        {summary.expenseByCategory.length === 0 ? <AppText muted>No spending in this month yet.</AppText> : summary.expenseByCategory.slice(0, 4).map((item) => (
          <CategoryBar key={item.category} label={item.category} amount={item.amount} max={Math.max(...summary.expenseByCategory.map((category) => category.amount), 1)} />
        ))}
      </Card>

      <Modal visible={monthPickerVisible} transparent animationType="fade" onRequestClose={() => setMonthPickerVisible(false)}>
        <View style={[styles.backdrop, { backgroundColor: theme.scheme === 'dark' ? 'rgba(0,0,0,0.52)' : 'rgba(7,17,19,0.28)' }]}>
          <View style={[styles.monthPanel, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
            <View style={styles.monthPickerHeader}>
              <Pressable onPress={() => setPickerYear((year) => year - 1)} style={[styles.iconButton, { backgroundColor: theme.colors.surfaceMuted }]}>
                <Ionicons name="chevron-back" size={22} color={theme.colors.text} />
              </Pressable>
              <AppText variant="h2">{pickerYear}</AppText>
              <Pressable onPress={() => setPickerYear((year) => year + 1)} style={[styles.iconButton, { backgroundColor: theme.colors.surfaceMuted }]}>
                <Ionicons name="chevron-forward" size={22} color={theme.colors.text} />
              </Pressable>
            </View>
            <View style={styles.monthGrid}>
              {monthNames.map((name, index) => {
                const month = `${pickerYear}-${String(index + 1).padStart(2, '0')}`;
                const selected = selectedMonth === month;
                return (
                  <Pressable key={month} onPress={() => selectMonth(month)} style={[styles.monthOption, { minHeight: layout.compact ? 42 : 46, backgroundColor: selected ? theme.colors.primary : theme.colors.surface }]}>
                    <AppText variant="small" style={{ color: selected ? theme.colors.background : theme.colors.text, fontWeight: selected ? '800' : '600' }}>{name}</AppText>
                  </Pressable>
                );
              })}
            </View>
            <View style={styles.monthPickerActions}>
              <Pressable onPress={() => selectMonth(currentMonth())} style={[styles.monthActionButton, { backgroundColor: theme.colors.surfaceMuted }]}>
                <AppText variant="small" style={{ color: theme.colors.primary }}>This month</AppText>
              </Pressable>
              <Pressable onPress={() => setMonthPickerVisible(false)} style={[styles.monthActionButton, { backgroundColor: theme.colors.surfaceMuted }]}>
                <AppText variant="small">Cancel</AppText>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

function SectionHeader({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  return (
    <View style={styles.sectionHeader}>
      <AppText variant="h2">{title}</AppText>
      {action ? (
        <Pressable onPress={onAction} hitSlop={8}>
          <AppText variant="small" style={styles.actionText}>{action}</AppText>
        </Pressable>
      ) : null}
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

function Metric({ label, value, color, backgroundColor }: { label: string; value: string; color: string; backgroundColor: string }) {
  return (
    <View style={[styles.metric, { backgroundColor }]}>
      <AppText variant="small" muted>{label}</AppText>
      <AppText style={{ color }}>{value}</AppText>
    </View>
  );
}

function QuickAction({
  icon,
  label,
  color,
  onPress,
  filled,
  backgroundColor,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  color: string;
  onPress: () => void;
  filled?: boolean;
  backgroundColor?: string;
}) {
  return (
    <PrimaryButton variant={filled ? 'primary' : 'ghost'} onPress={onPress} style={[styles.quickButton, filled && backgroundColor ? { backgroundColor } : undefined]}>
      <View style={styles.quickContent}>
        <Ionicons name={icon} size={22} color={color} />
        <AppText variant="small" style={filled ? styles.quickFilledLabel : undefined}>{label}</AppText>
      </View>
    </PrimaryButton>
  );
}

function formatMonthLabel(month: string) {
  const [year, monthValue] = month.split('-');
  const index = Number(monthValue) - 1;
  return `${monthNames[index] ?? monthValue} ${year}`;
}

function formatCreatedAt(value: string) {
  return new Date(value).toLocaleTimeString('en-BD', { hour: 'numeric', minute: '2-digit' });
}

function accountColor(type: string, palette: typeof colors) {
  if (type === 'BANK') return palette.bank;
  if (type === 'CASH') return palette.cash;
  if (type === 'WALLET') return palette.wallet;
  return palette.primary;
}

function buildAccountSummary(summary: DashboardSummary) {
  const groups = [
    { type: 'CASH', label: 'Cash' },
    { type: 'BANK', label: 'Bank' },
    { type: 'WALLET', label: 'Wallet' },
    { type: 'OTHER', label: 'Other' },
  ] as const;

  return groups
    .map((group) => {
      const accounts = summary.accountBalances.filter((account) => account.type === group.type);
      const balance = accounts.reduce((sum, account) => sum + account.balance, 0);
      const label = accounts.length === 1 ? accounts[0].accountName : group.label;

      return {
        ...group,
        label,
        balance,
      };
    })
    .filter((group) => group.balance !== 0 || summary.accountBalances.some((account) => account.type === group.type));
}

type RecentFeedItem = {
  kind: 'INCOME' | 'EXPENSE' | 'TRANSFER';
  id: number;
  title: string;
  subtitle: string;
  amountLabel: string;
  accent: string;
  when: string;
  icon: keyof typeof Ionicons.glyphMap;
  createdAt: string;
};

function buildRecentFeed(summary: DashboardSummary) {
  const transactions: RecentFeedItem[] = summary.recentTransactions.map((item) => ({
    kind: item.type,
    id: item.id,
    title: item.categoryName,
    subtitle: item.accountName,
    amountLabel: `${item.type === 'INCOME' ? '+' : '-'}${formatMoney(item.amount)}`,
    accent: item.type === 'INCOME' ? colors.income : colors.expense,
    when: formatCreatedAt(item.createdAt),
    icon: item.type === 'INCOME' ? 'arrow-down-left-box' : 'arrow-up-right-box',
    createdAt: item.createdAt,
  }));

  const transfers: RecentFeedItem[] = summary.recentTransfers.map((item) => ({
    kind: 'TRANSFER' as const,
    id: item.id,
    title: `${item.fromAccountName} -> ${item.toAccountName}`,
    subtitle: item.note || 'Internal money movement',
    amountLabel: formatMoney(item.amount),
    accent: colors.transfer,
    when: formatCreatedAt(item.createdAt),
    icon: 'swap-horizontal-outline' as keyof typeof Ionicons.glyphMap,
    createdAt: item.createdAt,
  }));

  return [...transactions, ...transfers]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 6);
}

const styles = StyleSheet.create({
  screen: {
    paddingBottom: spacing.lg,
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
  monthPill: {
    height: 34,
    borderRadius: 17,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.xs,
  },
  backdrop: {
    flex: 1,
    justifyContent: 'center',
    padding: spacing.lg,
    backgroundColor: 'rgba(0,0,0,0.72)',
  },
  monthPanel: {
    gap: spacing.lg,
    borderRadius: radius.xl,
    borderWidth: 1,
    padding: spacing.lg,
  },
  monthPickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  iconButton: {
    width: 42,
    height: 42,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  monthOption: {
    width: '30.8%',
    minHeight: 46,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthPickerActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
  },
  monthActionButton: {
    minHeight: 40,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
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
  },
  quickRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  quickButton: {
    flex: 1,
    minHeight: 54,
    borderRadius: radius.md,
  },
  quickContent: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  quickFilledLabel: {
    color: colors.background,
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
  accountSummaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  accountSummaryTile: {
    width: '48.5%',
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    gap: spacing.xs,
  },
  accountSummaryTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  accountBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
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
  todayCopy: {
    flex: 1,
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
