import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { TransactionsStackParamList } from '../../../app/routes/types';
import { AppText } from '../../../shared/components/AppText';
import { Card } from '../../../shared/components/Card';
import { DatePickerField } from '../../../shared/components/DatePickerField';
import { EmptyState } from '../../../shared/components/EmptyState';
import { Header } from '../../../shared/components/Header';
import { PrimaryButton } from '../../../shared/components/PrimaryButton';
import { Screen } from '../../../shared/components/Screen';
import { SegmentedControl } from '../../../shared/components/SegmentedControl';
import { colors, radius, spacing } from '../../../shared/theme/theme';
import { currentMonth, formatMoney, today } from '../../../shared/utils/format';
import type { Transaction } from '../../../shared/types/api';
import { transactionService } from '../services/transactionService';
import { useResponsiveLayout } from '../../../shared/layout/responsive';

type Props = NativeStackScreenProps<TransactionsStackParamList, 'TransactionList'>;
type TransactionView = 'day' | 'month' | 'year';

export function TransactionListScreen({ navigation }: Props) {
  const layout = useResponsiveLayout();
  const [items, setItems] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [view, setView] = useState<TransactionView>('month');
  const [selectedDate, setSelectedDate] = useState(today());
  const [selectedMonth, setSelectedMonth] = useState(currentMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  async function load() {
    try {
      setItems(await transactionService.list());
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

  const filteredItems = useMemo(() => items.filter((item) => {
    if (view === 'day') return item.transactionDate === selectedDate;
    if (view === 'month') return item.transactionDate.startsWith(selectedMonth);
    return item.transactionDate.startsWith(`${selectedYear}`);
  }), [items, selectedDate, selectedMonth, selectedYear, view]);
  const totalIncome = filteredItems.filter((item) => item.type === 'INCOME').reduce((sum, item) => sum + item.amount, 0);
  const totalExpense = filteredItems.filter((item) => item.type === 'EXPENSE').reduce((sum, item) => sum + item.amount, 0);
  const net = totalIncome - totalExpense;

  return (
    <Screen refreshing={refreshing} onRefresh={refresh}>
      <Header title="Transactions" subtitle="Date-wise income and expense editing" rightIcon="pricetags-outline" onRightPress={() => navigation.navigate('ManageCategories', { type: 'EXPENSE' })} />
      <View style={styles.actions}>
        <PrimaryButton onPress={() => navigation.navigate('AddIncome')} style={styles.action}>Income</PrimaryButton>
        <PrimaryButton variant="ghost" onPress={() => navigation.navigate('AddExpense')} style={styles.action}>Expense</PrimaryButton>
      </View>
      <SegmentedControl
        compact
        options={[
          { label: 'Day', value: 'day' },
          { label: 'Month', value: 'month' },
          { label: 'Year', value: 'year' },
        ]}
        value={view}
        onChange={(value) => setView(value as TransactionView)}
      />
      {view === 'day' ? (
        <DatePickerField label="Date" value={selectedDate} onChange={setSelectedDate} />
      ) : view === 'month' ? (
        <MonthSwitcher month={selectedMonth} onChange={setSelectedMonth} />
      ) : (
        <YearSwitcher year={selectedYear} onChange={setSelectedYear} />
      )}
      <Card>
        <View style={styles.summaryRow}>
          <SummaryMetric label="Income" value={formatMoney(totalIncome)} color={colors.income} />
          <SummaryMetric label="Expense" value={formatMoney(totalExpense)} color={colors.expense} />
          <SummaryMetric label="Net" value={formatMoney(net)} color={net >= 0 ? colors.income : colors.expense} />
        </View>
      </Card>
      {loading ? <ActivityIndicator color={colors.primary} /> : null}
      {!loading && filteredItems.length === 0 ? <EmptyState icon="receipt-outline" title="No transactions" message="Income and expenses will appear here. Transfers are kept separate." /> : null}
      {groupTransactions(filteredItems, view).map((group) => (
        <View key={group.date} style={styles.group}>
          <View style={styles.groupHeader}>
            <View>
              <AppText variant="h2">{formatDateLabel(group.date)}</AppText>
              <AppText variant="small" muted>{group.items.length} transaction{group.items.length === 1 ? '' : 's'}</AppText>
            </View>
            <View style={styles.dailyTotal}>
              <AppText variant="small" muted>Daily net</AppText>
              <AppText style={{ color: group.total >= 0 ? colors.income : colors.expense }}>{formatMoney(Math.abs(group.total))}</AppText>
            </View>
          </View>
          <Card style={styles.groupCard}>
            {group.items.map((item, index) => (
              <View key={item.id} style={[styles.row, index !== group.items.length - 1 && styles.divider]}>
                <View style={styles.left}>
                  <View style={[styles.icon, { width: layout.compact ? 38 : 42, height: layout.compact ? 38 : 42, borderRadius: layout.compact ? 19 : 21, backgroundColor: item.type === 'INCOME' ? 'rgba(54,211,153,0.13)' : 'rgba(255,122,122,0.13)' }]}>
                    <Ionicons name={item.type === 'INCOME' ? 'arrow-down-left-box' : 'arrow-up-right-box'} size={18} color={item.type === 'INCOME' ? colors.income : colors.expense} />
                  </View>
                  <View style={styles.copy}>
                    <AppText>{item.categoryName}</AppText>
                    <AppText variant="small" muted>{item.accountName}</AppText>
                    {item.note ? <AppText variant="small" muted>{item.note}</AppText> : null}
                  </View>
                </View>
                <View style={styles.rowRight}>
                  <AppText style={{ color: item.type === 'INCOME' ? colors.income : colors.expense }}>
                    {item.type === 'INCOME' ? '+' : '-'}{formatMoney(item.amount)}
                  </AppText>
                  <AppText variant="small" muted>{formatTimeLabel(item.createdAt)}</AppText>
                  <View style={styles.rowActions}>
                    <Pressable
                      onPress={() => navigation.navigate(item.type === 'INCOME' ? 'AddIncome' : 'AddExpense', { duplicateTransactionId: item.id })}
                      style={[styles.editButton, { width: layout.compact ? 32 : 34, height: layout.compact ? 32 : 34, borderRadius: layout.compact ? 16 : 17 }]}
                    >
                      <Ionicons name="copy-outline" size={18} color={colors.accent} />
                    </Pressable>
                    <Pressable
                      onPress={() => navigation.navigate(item.type === 'INCOME' ? 'AddIncome' : 'AddExpense', { transactionId: item.id })}
                      style={[styles.editButton, { width: layout.compact ? 32 : 34, height: layout.compact ? 32 : 34, borderRadius: layout.compact ? 16 : 17 }]}
                    >
                      <Ionicons name="create-outline" size={18} color={colors.primary} />
                    </Pressable>
                  </View>
                </View>
              </View>
            ))}
          </Card>
        </View>
      ))}
    </Screen>
  );
}

function SummaryMetric({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <View style={styles.summaryMetric}>
      <AppText variant="small" muted>{label}</AppText>
      <AppText style={{ color }}>{value}</AppText>
    </View>
  );
}

function groupTransactions(items: Transaction[], view: TransactionView) {
  const groups = new Map<string, Transaction[]>();
  items.forEach((item) => {
    const key = view === 'year' ? item.transactionDate.slice(0, 7) : item.transactionDate;
    groups.set(key, [...(groups.get(key) ?? []), item]);
  });

  return Array.from(groups.entries())
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([date, groupItems]) => ({
      date,
      items: groupItems.sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
      total: groupItems.reduce((sum, item) => sum + (item.type === 'INCOME' ? item.amount : -item.amount), 0),
    }));
}

function formatDateLabel(date: string) {
  if (/^\d{4}-\d{2}$/.test(date)) {
    const [year, month] = date.split('-').map(Number);
    return new Date(year, month - 1, 1).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  }
  const parsed = new Date(`${date}T00:00:00`);
  return parsed.toLocaleDateString('en-US', { month: 'short', day: 'numeric', weekday: 'short' });
}

function formatTimeLabel(dateTime: string) {
  return new Date(dateTime).toLocaleTimeString('en-BD', { hour: 'numeric', minute: '2-digit' });
}

function MonthSwitcher({ month, onChange }: { month: string; onChange: (value: string) => void }) {
  const [year, monthValue] = month.split('-').map(Number);

  function move(delta: number) {
    const date = new Date(year, monthValue - 1 + delta, 1);
    onChange(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`);
  }

  return (
    <View style={styles.selectorRow}>
      <PrimaryButton compact variant="ghost" onPress={() => move(-1)} style={styles.selectorButton}>Prev</PrimaryButton>
      <View style={styles.selectorValue}>
        <AppText variant="h2">{formatDateLabel(month)}</AppText>
      </View>
      <PrimaryButton compact variant="ghost" onPress={() => move(1)} style={styles.selectorButton}>Next</PrimaryButton>
    </View>
  );
}

function YearSwitcher({ year, onChange }: { year: number; onChange: (value: number) => void }) {
  return (
    <View style={styles.selectorRow}>
      <PrimaryButton compact variant="ghost" onPress={() => onChange(year - 1)} style={styles.selectorButton}>Prev</PrimaryButton>
      <View style={styles.selectorValue}>
        <AppText variant="h2">{year}</AppText>
      </View>
      <PrimaryButton compact variant="ghost" onPress={() => onChange(year + 1)} style={styles.selectorButton}>Next</PrimaryButton>
    </View>
  );
}

const styles = StyleSheet.create({
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  action: {
    flex: 1,
    borderRadius: radius.lg,
  },
  selectorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  selectorButton: {
    minHeight: 38,
    minWidth: 72,
  },
  selectorValue: {
    flex: 1,
    alignItems: 'center',
  },
  summaryRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  summaryMetric: {
    flex: 1,
    gap: spacing.xs,
  },
  group: {
    gap: spacing.sm,
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  dailyTotal: {
    alignItems: 'flex-end',
    gap: spacing.xs,
  },
  groupCard: {
    paddingVertical: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingVertical: spacing.md,
  },
  rowActions: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    flex: 1,
  },
  icon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: {
    flex: 1,
    gap: spacing.xs,
  },
  divider: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  rowRight: {
    alignItems: 'flex-end',
    gap: spacing.sm,
    maxWidth: '36%',
  },
  editButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(20,158,110,0.10)',
  },
});
