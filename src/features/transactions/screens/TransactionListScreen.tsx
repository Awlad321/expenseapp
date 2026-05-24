import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { TransactionsStackParamList } from '../../../app/routes/types';
import { AppText } from '../../../shared/components/AppText';
import { Card } from '../../../shared/components/Card';
import { EmptyState } from '../../../shared/components/EmptyState';
import { Header } from '../../../shared/components/Header';
import { PrimaryButton } from '../../../shared/components/PrimaryButton';
import { Screen } from '../../../shared/components/Screen';
import { colors, spacing } from '../../../shared/theme/theme';
import { currentMonth, formatMoney } from '../../../shared/utils/format';
import type { Transaction } from '../../../shared/types/api';
import { transactionService } from '../services/transactionService';

type Props = NativeStackScreenProps<TransactionsStackParamList, 'TransactionList'>;

export function TransactionListScreen({ navigation }: Props) {
  const [items, setItems] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function load() {
    try {
      setItems(await transactionService.list({ month: currentMonth() }));
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

  return (
    <Screen refreshing={refreshing} onRefresh={refresh}>
      <Header title="Transactions" subtitle="Income and expense only" />
      <View style={styles.actions}>
        <PrimaryButton onPress={() => navigation.navigate('AddIncome')} style={styles.action}>Income</PrimaryButton>
        <PrimaryButton variant="ghost" onPress={() => navigation.navigate('AddExpense')} style={styles.action}>Expense</PrimaryButton>
      </View>
      {loading ? <ActivityIndicator color={colors.primary} /> : null}
      {!loading && items.length === 0 ? <EmptyState icon="receipt-outline" title="No transactions" message="Income and expenses will appear here. Transfers are kept separate." /> : null}
      {groupTransactions(items).map((group) => (
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
                  <View style={[styles.icon, { backgroundColor: item.type === 'INCOME' ? 'rgba(54,211,153,0.13)' : 'rgba(255,122,122,0.13)' }]}>
                    <Ionicons name={item.type === 'INCOME' ? 'arrow-down-left-box' : 'arrow-up-right-box'} size={18} color={item.type === 'INCOME' ? colors.income : colors.expense} />
                  </View>
                  <View style={styles.copy}>
                    <AppText>{item.categoryName}</AppText>
                    <AppText variant="small" muted>{item.accountName}</AppText>
                  </View>
                </View>
                <View style={styles.rowRight}>
                  <AppText style={{ color: item.type === 'INCOME' ? colors.income : colors.expense }}>
                    {item.type === 'INCOME' ? '+' : '-'}{formatMoney(item.amount)}
                  </AppText>
                  <Pressable
                    onPress={() => navigation.navigate(item.type === 'INCOME' ? 'AddIncome' : 'AddExpense', { transactionId: item.id })}
                    style={styles.editButton}
                  >
                    <Ionicons name="create-outline" size={18} color={colors.primary} />
                  </Pressable>
                </View>
              </View>
            ))}
          </Card>
        </View>
      ))}
    </Screen>
  );
}

function groupTransactions(items: Transaction[]) {
  const groups = new Map<string, Transaction[]>();
  items.forEach((item) => {
    groups.set(item.transactionDate, [...(groups.get(item.transactionDate) ?? []), item]);
  });

  return Array.from(groups.entries()).map(([date, groupItems]) => ({
    date,
    items: groupItems,
    total: groupItems.reduce((sum, item) => sum + (item.type === 'INCOME' ? item.amount : -item.amount), 0),
  }));
}

function formatDateLabel(date: string) {
  const parsed = new Date(`${date}T00:00:00`);
  return parsed.toLocaleDateString('en-US', { month: 'short', day: 'numeric', weekday: 'short' });
}

const styles = StyleSheet.create({
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  action: {
    flex: 1,
    borderRadius: 18,
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
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingVertical: spacing.md,
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
