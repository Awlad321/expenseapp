import { useCallback, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { AccountsStackParamList } from '../../../app/routes/types';
import { AppText } from '../../../shared/components/AppText';
import { Card } from '../../../shared/components/Card';
import { DatePickerField } from '../../../shared/components/DatePickerField';
import { EmptyState } from '../../../shared/components/EmptyState';
import { Header } from '../../../shared/components/Header';
import { PrimaryButton } from '../../../shared/components/PrimaryButton';
import { Screen } from '../../../shared/components/Screen';
import { SegmentedControl } from '../../../shared/components/SegmentedControl';
import { colors, radius, spacing } from '../../../shared/theme/theme';
import { useTheme } from '../../../shared/theme/ThemeContext';
import { formatMoney, currentMonth, today } from '../../../shared/utils/format';
import type { AccountLedger, LedgerReferenceType } from '../../../shared/types/api';
import { accountService } from '../services/accountService';
import { useResponsiveLayout } from '../../../shared/layout/responsive';

type Props = NativeStackScreenProps<AccountsStackParamList, 'AccountLedger'>;
type LedgerView = 'day' | 'month' | 'year';

export function AccountLedgerScreen({ route, navigation }: Props) {
  const { accountId, accountName } = route.params;
  const layout = useResponsiveLayout();
  const theme = useTheme();
  const [items, setItems] = useState<AccountLedger[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [view, setView] = useState<LedgerView>('month');
  const [typeFilter, setTypeFilter] = useState<'ALL' | LedgerReferenceType>('ALL');
  const [selectedDay, setSelectedDay] = useState(today());
  const [selectedMonth, setSelectedMonth] = useState(currentMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  async function load() {
    try {
      setItems(await accountService.ledger(accountId));
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
  }, [accountId]));

  const filteredItems = items.filter((item) => {
    const date = item.createdAt.slice(0, 10);
    const matchesView = view === 'day'
      ? date === selectedDay
      : view === 'month'
        ? date.startsWith(selectedMonth)
        : date.startsWith(`${selectedYear}`);

    return matchesView && (typeFilter === 'ALL' || item.referenceType === typeFilter);
  });
  const totalCredit = filteredItems.filter((item) => item.direction === 'CREDIT').reduce((sum, item) => sum + item.amount, 0);
  const totalDebit = filteredItems.filter((item) => item.direction === 'DEBIT').reduce((sum, item) => sum + item.amount, 0);
  const chronologicallySorted = [...filteredItems].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const openingBalance = chronologicallySorted[0] ? chronologicallySorted[0].balanceAfter - (chronologicallySorted[0].direction === 'CREDIT' ? chronologicallySorted[0].amount : -chronologicallySorted[0].amount) : 0;
  const closingBalance = chronologicallySorted.at(-1)?.balanceAfter ?? 0;
  const groups = buildLedgerGroups(filteredItems, view);

  return (
    <Screen refreshing={refreshing} onRefresh={refresh}>
      <Header title="Ledger" subtitle={accountName} rightIcon="arrow-back-outline" onRightPress={() => navigation.goBack()} />
      {loading ? <ActivityIndicator color={colors.primary} /> : null}

      <SegmentedControl
        compact
        options={[
          { label: 'Day', value: 'day' },
          { label: 'Month', value: 'month' },
          { label: 'Year', value: 'year' },
        ]}
        value={view}
        onChange={(value) => setView(value as LedgerView)}
      />

      {view === 'day' ? (
        <DatePickerField label="Date" value={selectedDay} onChange={setSelectedDay} />
      ) : view === 'month' ? (
        <MonthSwitcher month={selectedMonth} onChange={setSelectedMonth} />
      ) : (
        <YearSwitcher year={selectedYear} onChange={setSelectedYear} />
      )}

      <FilterRow
        title="Type"
        options={[
          { label: 'All', value: 'ALL' },
          { label: 'Income', value: 'INCOME' },
          { label: 'Expense', value: 'EXPENSE' },
          { label: 'Transfer', value: 'TRANSFER' },
          { label: 'Fee', value: 'TRANSFER_FEE' },
          { label: 'Open', value: 'OPENING_BALANCE' },
          { label: 'Adjust', value: 'MANUAL_ADJUSTMENT' },
        ]}
        value={typeFilter}
        onChange={(value) => setTypeFilter(value as 'ALL' | LedgerReferenceType)}
      />

      <Card>
        <View style={styles.summaryRow}>
          <SummaryMetric label="Opening" value={formatMoney(openingBalance)} color={theme.colors.text} />
          <SummaryMetric label="Credit" value={formatMoney(totalCredit)} color={colors.income} />
          <SummaryMetric label="Debit" value={formatMoney(totalDebit)} color={colors.expense} />
        </View>
        <View style={[styles.summaryRow, styles.summaryRowSecondary]}>
          <SummaryMetric label="Net" value={formatMoney(totalCredit - totalDebit)} color={totalCredit >= totalDebit ? colors.income : colors.expense} />
          <SummaryMetric label="Closing" value={formatMoney(closingBalance)} color={theme.colors.accent} />
        </View>
      </Card>

      {!loading && filteredItems.length === 0 ? (
        <EmptyState icon="reader-outline" title="No ledger entries" message="Balance movements for this account will appear here." />
      ) : null}
      {groups.map((group) => (
        <Card key={group.key}>
          <View style={styles.groupHeader}>
            <AppText variant="h2">{group.label}</AppText>
            <AppText variant="small" muted>
              +{formatMoney(group.credit)} / -{formatMoney(group.debit)}
            </AppText>
          </View>
          {group.items.map((item) => {
            const credit = item.direction === 'CREDIT';
            return (
              <View key={item.id} style={styles.row}>
                <View style={styles.left}>
                  <View style={[styles.icon, { width: layout.compact ? 40 : 44, height: layout.compact ? 40 : 44, borderRadius: layout.compact ? 20 : 22, backgroundColor: credit ? 'rgba(54,211,153,0.13)' : 'rgba(255,122,122,0.13)' }]}>
                    <Ionicons name={credit ? 'add-circle-outline' : 'remove-circle-outline'} size={22} color={credit ? colors.income : colors.expense} />
                  </View>
                  <View style={styles.copy}>
                    <AppText>{formatReference(item.referenceType)}</AppText>
                    <AppText variant="small" muted>{item.description ?? formatCreatedAt(item.createdAt)}</AppText>
                  </View>
                </View>
                <View style={styles.amounts}>
                  <AppText style={{ color: credit ? colors.income : colors.expense }}>
                    {credit ? '+' : '-'}{formatMoney(item.amount)}
                  </AppText>
                  <AppText variant="small" muted>After {formatMoney(item.balanceAfter)}</AppText>
                </View>
              </View>
            );
          })}
        </Card>
      ))}
    </Screen>
  );
}

function SummaryMetric({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <View style={styles.metric}>
      <AppText variant="small" muted>{label}</AppText>
      <AppText style={{ color }}>{value}</AppText>
    </View>
  );
}

function FilterRow({
  title,
  options,
  value,
  onChange,
}: {
  title: string;
  options: Array<{ label: string; value: string }>;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <View style={styles.filterBlock}>
      <AppText variant="small" muted>{title}</AppText>
      <View style={styles.filterChips}>
        {options.map((option) => (
          <PrimaryButton
            key={option.value}
            compact
            variant={value === option.value ? 'primary' : 'ghost'}
            onPress={() => onChange(option.value)}
            style={styles.filterChip}
          >
            {option.label}
          </PrimaryButton>
        ))}
      </View>
    </View>
  );
}

function MonthSwitcher({ month, onChange }: { month: string; onChange: (month: string) => void }) {
  const [year, monthValue] = month.split('-').map(Number);
  function move(delta: number) {
    const date = new Date(year, monthValue - 1 + delta, 1);
    onChange(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`);
  }

  return (
    <View style={styles.selectorRow}>
      <PrimaryButton compact variant="ghost" onPress={() => move(-1)} style={styles.selectorButton}>Prev</PrimaryButton>
      <View style={styles.selectorValue}>
        <AppText variant="h2">{formatMonthLabel(month)}</AppText>
      </View>
      <PrimaryButton compact variant="ghost" onPress={() => move(1)} style={styles.selectorButton}>Next</PrimaryButton>
    </View>
  );
}

function YearSwitcher({ year, onChange }: { year: number; onChange: (year: number) => void }) {
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

function buildLedgerGroups(items: AccountLedger[], view: LedgerView) {
  const map = new Map<string, AccountLedger[]>();

  items.forEach((item) => {
    const dateKey = item.createdAt.slice(0, 10);
    const key = view === 'year' ? item.createdAt.slice(0, 7) : dateKey;
    map.set(key, [...(map.get(key) ?? []), item]);
  });

  return Array.from(map.entries())
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([key, groupItems]) => ({
      key,
      label: view === 'year' ? formatMonthLabel(key) : formatDateLabel(key),
      credit: groupItems.filter((item) => item.direction === 'CREDIT').reduce((sum, item) => sum + item.amount, 0),
      debit: groupItems.filter((item) => item.direction === 'DEBIT').reduce((sum, item) => sum + item.amount, 0),
      items: groupItems.sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    }));
}

function formatReference(value: string) {
  return value
    .split('_')
    .map((part) => part.charAt(0) + part.slice(1).toLowerCase())
    .join(' ');
}

function formatCreatedAt(value: string) {
  return new Date(value).toLocaleString('en-BD', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

function formatDateLabel(value: string) {
  return new Date(`${value}T00:00:00`).toLocaleDateString('en-BD', { month: 'short', day: 'numeric', weekday: 'short' });
}

function formatMonthLabel(value: string) {
  const [year, month] = value.split('-');
  return new Date(Number(year), Number(month) - 1, 1).toLocaleDateString('en-BD', { month: 'short', year: 'numeric' });
}

const styles = StyleSheet.create({
  summaryRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  summaryRowSecondary: {
    marginTop: spacing.sm,
  },
  metric: {
    flex: 1,
    gap: spacing.xs,
  },
  filterBlock: {
    gap: spacing.sm,
  },
  filterChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  filterChip: {
    minHeight: 36,
  },
  selectorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  selectorButton: {
    minWidth: 72,
    minHeight: 38,
  },
  selectorValue: {
    flex: 1,
    alignItems: 'center',
  },
  groupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    flex: 1,
  },
  icon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: {
    flex: 1,
    gap: spacing.xs,
  },
  amounts: {
    alignItems: 'flex-end',
    gap: spacing.xs,
  },
});
