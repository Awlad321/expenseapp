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
import type { Debt, DebtStatus } from '../../../shared/types/api';
import { debtService } from '../services/debtService';

type Props = NativeStackScreenProps<DebtsStackParamList, 'DebtsHome'>;
type FilterValue = 'ALL' | 'ACTIVE' | 'PAID' | 'OVERDUE';

export function DebtListScreen({ navigation }: Props) {
  const theme = useTheme();
  const [items, setItems] = useState<Debt[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterValue>('ALL');

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
      if (filter === 'ALL') return true;
      if (filter === 'PAID') return item.status === 'FULLY_PAID';
      if (filter === 'OVERDUE') return item.status === 'OVERDUE';
      return item.status === 'ACTIVE' || item.status === 'PARTIALLY_PAID';
    });
  }, [filter, items, search]);

  return (
    <Screen refreshing={refreshing} onRefresh={refresh}>
      <Header title="Debt Manager" subtitle="Personal liabilities only" rightIcon="add-outline" onRightPress={() => navigation.navigate('AddEditDebt')} />
      <FormInput label="Search" placeholder="Search by person name" value={search} onChangeText={setSearch} />
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
        <EmptyState icon="people-outline" title="No debts found" message="Add personal borrowings here without mixing them into expenses, cards, or transfers." />
      ) : null}
      {filtered.map((debt) => {
        const progress = debt.totalAmount > 0 ? Math.min((debt.totalPaid / debt.totalAmount) * 100, 100) : 0;
        const palette = debtPalette(debt.status, theme.colors);
        return (
          <Pressable key={debt.id} onPress={() => navigation.navigate('DebtDetails', { debtId: debt.id })}>
            <Card>
              <View style={styles.row}>
                <View style={styles.left}>
                  <AppText variant="h2">{debt.personName}</AppText>
                  <AppText variant="small" muted>{debt.tag ?? debt.description ?? 'Personal debt'}</AppText>
                </View>
                <View style={[styles.badge, { backgroundColor: `${palette}15` }]}>
                  <AppText variant="small" style={{ color: palette }}>{statusLabel(debt.status)}</AppText>
                </View>
              </View>
              <View style={styles.metrics}>
                <Metric label="Remaining" value={formatMoney(debt.remainingAmount)} color={palette} />
                <Metric label="Total" value={formatMoney(debt.totalAmount)} />
                <Metric label="Last payment" value={debt.lastPaymentDate ?? 'None'} />
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

function debtPalette(status: DebtStatus, palette: ReturnType<typeof useTheme>['colors']) {
  if (status === 'FULLY_PAID') return palette.income;
  if (status === 'OVERDUE') return palette.expense;
  if (status === 'PARTIALLY_PAID') return palette.warning;
  return palette.warning;
}

const styles = StyleSheet.create({
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
