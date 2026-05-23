import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { AccountsStackParamList } from '../../../app/routes/types';
import { AppText } from '../../../shared/components/AppText';
import { Card } from '../../../shared/components/Card';
import { EmptyState } from '../../../shared/components/EmptyState';
import { Header } from '../../../shared/components/Header';
import { PrimaryButton } from '../../../shared/components/PrimaryButton';
import { Screen } from '../../../shared/components/Screen';
import { colors, spacing } from '../../../shared/theme/theme';
import { useTheme } from '../../../shared/theme/ThemeContext';
import { formatMoney } from '../../../shared/utils/format';
import type { Account } from '../../../shared/types/api';
import { accountService } from '../services/accountService';

type Props = NativeStackScreenProps<AccountsStackParamList, 'AccountsHome'>;

export function AccountsScreen({ navigation }: Props) {
  const theme = useTheme();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function load() {
    try {
      setAccounts(await accountService.list());
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
      <Header title="Accounts" subtitle="Cash, bank, and wallets" rightIcon="add-outline" onRightPress={() => navigation.navigate('AddEditAccount')} />
      {loading ? <ActivityIndicator color={colors.primary} /> : null}
      {!loading && accounts.length === 0 ? (
        <EmptyState icon="wallet-outline" title="No accounts yet" message="Create Cash, Bank, bKash, Nagad, or Rocket sources first." />
      ) : accounts.map((account) => (
        <Pressable key={account.id} onPress={() => navigation.navigate('AccountLedger', { accountId: account.id, accountName: account.name })}>
        <Card>
          <View style={styles.row}>
            <View style={styles.left}>
              <View style={[styles.icon, { backgroundColor: theme.colors.surfaceMuted }]}>
                <Ionicons name={account.type === 'BANK' ? 'business-outline' : account.type === 'CASH' ? 'cash-outline' : 'wallet-outline'} size={22} color={theme.colors.primary} />
              </View>
              <View>
                <AppText variant="h2">{account.name}</AppText>
                <AppText variant="small" muted>{account.type} {account.active ? 'Active' : 'Inactive'}</AppText>
              </View>
            </View>
            <AppText variant="h2">{formatMoney(account.currentBalance)}</AppText>
          </View>
          <View style={styles.ledgerHint}>
            <AppText variant="small" muted>View ledger</AppText>
            <Ionicons name="chevron-forward" size={16} color={theme.colors.textMuted} />
          </View>
        </Card>
        </Pressable>
      ))}
      <PrimaryButton onPress={() => navigation.navigate('AddEditAccount')}>Add Account</PrimaryButton>
    </Screen>
  );
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
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ledgerHint: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: spacing.xs,
  },
});
