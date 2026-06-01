import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { DebtsStackParamList } from '../../../app/routes/types';
import { AppText } from '../../../shared/components/AppText';
import { Card } from '../../../shared/components/Card';
import { EmptyState } from '../../../shared/components/EmptyState';
import { FormInput } from '../../../shared/components/FormInput';
import { Header } from '../../../shared/components/Header';
import { PrimaryButton } from '../../../shared/components/PrimaryButton';
import { Screen } from '../../../shared/components/Screen';
import { useTheme } from '../../../shared/theme/ThemeContext';
import { formatMoney } from '../../../shared/utils/format';
import type { Debt, DebtKind, DebtStatus } from '../../../shared/types/api';
import { debtService } from '../services/debtService';

type Props = NativeStackScreenProps<DebtsStackParamList, 'DebtsHome'>;
type FilterValue = 'ALL' | 'ACTIVE' | 'PAID' | 'OVERDUE';
type KindFilter = 'ALL' | DebtKind;

export function DebtListScreen({ navigation }: Props) {
  const theme = useTheme();
  const [items, setItems] = useState<Debt[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterValue>('ALL');
  const [kindFilter, setKindFilter] = useState<KindFilter>('ALL');

  async function load() {
    try {
      setItems(await debtService.list());
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

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return items.filter((item) => {
      const matchesSearch = !query || item.personName.toLowerCase().includes(query);
      if (!matchesSearch) return false;
      if (kindFilter !== 'ALL' && item.kind !== kindFilter) return false;
      if (filter === 'ALL') return true;
      if (filter === 'PAID') return item.status === 'FULLY_PAID';
      if (filter === 'OVERDUE') return item.status === 'OVERDUE';
      return item.status === 'ACTIVE' || item.status === 'PARTIALLY_PAID';
    });
  }, [filter, items, kindFilter, search]);

  const borrowedTotal = items.filter((item) => item.kind === 'BORROWED' && item.status !== 'FULLY_PAID').reduce((sum, item) => sum + item.remainingAmount, 0);
  const lentTotal = items.filter((item) => item.kind === 'LENT' && item.status !== 'FULLY_PAID').reduce((sum, item) => sum + item.remainingAmount, 0);

  return (
    <Screen refreshing={refreshing} onRefresh={refresh}>
      <Header title="Debt Manager" subtitle="Borrowed and lent money, separate from expenses" rightIcon="add-outline" onRightPress={() => navigation.navigate('AddEditDebt')} />
      <View style={styles.summaryRow}>
        <Card style={styles.summaryCard}>
          <AppText variant="small" muted>I borrowed</AppText>
          <AppText variant="h2" style={{ color: theme.colors.warning }}>{formatMoney(borrowedTotal)}</AppText>
        </Card>
        <Card style={styles.summaryCard}>
          <AppText variant="small" muted>I gave</AppText>
          <AppText variant="h2" style={{ color: theme.colors.accent }}>{formatMoney(lentTotal)}</AppText>
        </Card>
      </View>
      <FormInput label="Search" placeholder="Search by person name" value={search} onChangeText={setSearch} />
      <View style={styles.filters}>
        {[
          { value: 'ALL', label: 'All' },
          { value: 'BORROWED', label: 'Borrowed' },
          { value: 'LENT', label: 'Lent' },
        ].map((option) => (
          <PrimaryButton
            compact
            key={option.value}
            variant={kindFilter === option.value ? 'primary' : 'ghost'}
            onPress={() => setKindFilter(option.value as KindFilter)}
            style={styles.filterButton}
          >
            {option.label}
          </PrimaryButton>
        ))}
      </View>
      <View style={styles.filters}>
        {[
          { value: 'ALL', label: 'All' },
          { value: 'ACTIVE', label: 'Active' },
          { value: 'PAID', label: 'Paid' },
          { value: 'OVERDUE', label: 'Overdue' },
        ].map((option) => (
          <PrimaryButton
            compact
            key={option.value}
            variant={filter === option.value ? 'primary' : 'ghost'}
            onPress={() => setFilter(option.value as FilterValue)}
            style={styles.filterButton}
          >
            {option.label}
          </PrimaryButton>
        ))}
      </View>
      {loading ? <ActivityIndicator color={theme.colors.primary} /> : null}
      {!loading && filtered.length === 0 ? (
        <EmptyState icon="people-outline" title="No debt records found" message="Track money you borrowed and money you gave without mixing them into expenses, cards, or transfers." />
      ) : null}
      {filtered.map((debt) => {
        const progress = debt.totalAmount > 0 ? Math.min((debt.totalPaid / debt.totalAmount) * 100, 100) : 0;
        const palette = debtPalette(debt.status, debt.kind, theme.colors);
        return (
          <Pressable key={debt.id} onPress={() => navigation.navigate('DebtDetails', { debtId: debt.id })}>
            <Card>
              <View style={styles.row}>
                <View style={styles.left}>
                  <AppText variant="h2">{debt.personName}</AppText>
                  <AppText variant="small" muted>{debt.kind === 'BORROWED' ? 'I borrowed' : 'I gave'}{debt.tag ? ` · ${debt.tag}` : debt.description ? ` · ${debt.description}` : ''}</AppText>
                </View>
                <View style={styles.badges}>
                  <View style={[styles.directionBadge, { backgroundColor: `${kindColor(debt.kind, theme.colors)}15` }]}>
                    <AppText variant="small" style={{ color: kindColor(debt.kind, theme.colors) }}>{debt.kind === 'BORROWED' ? 'Borrowed' : 'Lent'}</AppText>
                  </View>
                  <View style={[styles.badge, { backgroundColor: `${palette}15` }]}>
                    <AppText variant="small" style={{ color: palette }}>{statusLabel(debt.status)}</AppText>
                  </View>
                </View>
              </View>
              <View style={styles.metrics}>
                <Metric label={debt.kind === 'BORROWED' ? 'Remaining' : 'Unpaid'} value={formatMoney(debt.remainingAmount)} color={palette} />
                <Metric label="Total" value={formatMoney(debt.totalAmount)} />
                <Metric label={debt.kind === 'BORROWED' ? 'Last payment' : 'Last collected'} value={debt.lastPaymentDate ?? 'None'} />
              </View>
              <View style={[styles.track, { backgroundColor: theme.colors.surfaceMuted }]}>
                <View style={[styles.fill, { width: `${Math.max(progress, debt.totalPaid > 0 ? 4 : 0)}%`, backgroundColor: palette }]} />
              </View>
            </Card>
          </Pressable>
        );
      })}
    </Screen>
  );
}

function Metric({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <View style={styles.metric}>
      <AppText variant="small" muted>{label}</AppText>
      <AppText style={color ? { color } : undefined}>{value}</AppText>
    </View>
  );
}

function statusLabel(status: DebtStatus) {
  if (status === 'PARTIALLY_PAID') return 'Partially paid';
  if (status === 'FULLY_PAID') return 'Fully paid';
  return status.charAt(0) + status.slice(1).toLowerCase();
}

function debtPalette(status: DebtStatus, kind: DebtKind, palette: ReturnType<typeof useTheme>['colors']) {
  if (status === 'FULLY_PAID') return palette.income;
  if (status === 'OVERDUE') return palette.expense;
  if (kind === 'LENT') return palette.accent;
  if (status === 'PARTIALLY_PAID') return palette.warning;
  return palette.warning;
}

function kindColor(kind: DebtKind, palette: ReturnType<typeof useTheme>['colors']) {
  return kind === 'LENT' ? palette.accent : palette.warning;
}

const styles = StyleSheet.create({
  summaryRow: {
    flexDirection: 'row',
    gap: 8,
  },
  summaryCard: {
    flex: 1,
    gap: 6,
  },
  filters: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterButton: {
    minHeight: 36,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  left: {
    flex: 1,
    gap: 4,
  },
  badge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    alignSelf: 'flex-start',
  },
  badges: {
    alignItems: 'flex-end',
    gap: 6,
  },
  directionBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    alignSelf: 'flex-start',
  },
  metrics: {
    flexDirection: 'row',
    gap: 12,
  },
  metric: {
    flex: 1,
    gap: 4,
  },
  track: {
    height: 8,
    borderRadius: 8,
    overflow: 'hidden',
  },
  fill: {
    height: 8,
    borderRadius: 8,
  },
});
