import { useCallback, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { AccountsStackParamList } from '../../../app/routes/types';
import { AppText } from '../../../shared/components/AppText';
import { Card } from '../../../shared/components/Card';
import { EmptyState } from '../../../shared/components/EmptyState';
import { Header } from '../../../shared/components/Header';
import { Screen } from '../../../shared/components/Screen';
import { colors, spacing } from '../../../shared/theme/theme';
import { formatMoney } from '../../../shared/utils/format';
import type { AccountLedger } from '../../../shared/types/api';
import { accountService } from '../services/accountService';

type Props = NativeStackScreenProps<AccountsStackParamList, 'AccountLedger'>;

export function AccountLedgerScreen({ route, navigation }: Props) {
  const { accountId, accountName } = route.params;
  const [items, setItems] = useState<AccountLedger[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

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

  return (
    <Screen refreshing={refreshing} onRefresh={refresh}>
      <Header title="Ledger" subtitle={accountName} rightIcon="arrow-back-outline" onRightPress={() => navigation.goBack()} />
      {loading ? <ActivityIndicator color={colors.primary} /> : null}
      {!loading && items.length === 0 ? (
        <EmptyState icon="reader-outline" title="No ledger entries" message="Balance movements for this account will appear here." />
      ) : null}
      {items.map((item) => {
        const credit = item.direction === 'CREDIT';
        return (
          <Card key={item.id}>
            <View style={styles.row}>
              <View style={styles.left}>
                <View style={[styles.icon, { backgroundColor: credit ? 'rgba(54,211,153,0.13)' : 'rgba(255,122,122,0.13)' }]}>
                  <Ionicons name={credit ? 'add-circle-outline' : 'remove-circle-outline'} size={22} color={credit ? colors.income : colors.expense} />
                </View>
                <View style={styles.copy}>
                  <AppText>{formatReference(item.referenceType)}</AppText>
                  <AppText variant="small" muted>{item.description ?? item.createdAt}</AppText>
                </View>
              </View>
              <View style={styles.amounts}>
                <AppText style={{ color: credit ? colors.income : colors.expense }}>
                  {credit ? '+' : '-'}{formatMoney(item.amount)}
                </AppText>
                <AppText variant="small" muted>After {formatMoney(item.balanceAfter)}</AppText>
              </View>
            </View>
          </Card>
        );
      })}
    </Screen>
  );
}

function formatReference(value: string) {
  return value
    .split('_')
    .map((part) => part.charAt(0) + part.slice(1).toLowerCase())
    .join(' ');
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
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
