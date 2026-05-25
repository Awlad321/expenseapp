import { useCallback, useMemo, useState } from 'react';
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
import type { Account, AccountType } from '../../../shared/types/api';
import { accountService } from '../services/accountService';
import { useResponsiveLayout } from '../../../shared/layout/responsive';

type Props = NativeStackScreenProps<AccountsStackParamList, 'AccountsHome'>;

export function AccountsScreen({ navigation }: Props) {
  const theme = useTheme();
  const layout = useResponsiveLayout();
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

  const groupedAccounts = useMemo(() => buildAccountGroups(accounts), [accounts]);

  return (
    <Screen refreshing={refreshing} onRefresh={refresh}>
      <Header title="Accounts" subtitle="Cash, bank, and wallets" rightIcon="add-outline" onRightPress={() => navigation.navigate('AddEditAccount')} />
      {loading ? <ActivityIndicator color={colors.primary} /> : null}
      {!loading && accounts.length === 0 ? (
        <EmptyState icon="wallet-outline" title="No accounts yet" message="Create Cash, Bank, bKash, Nagad, or Rocket sources first." />
      ) : groupedAccounts.map((group) => (
        <View key={group.type} style={styles.section}>
          <View style={styles.sectionHeader}>
            <View>
              <AppText variant="h2">{group.label}</AppText>
              <AppText variant="small" muted>{group.accounts.length} account{group.accounts.length === 1 ? '' : 's'}</AppText>
            </View>
            <AppText>{formatMoney(group.total)}</AppText>
          </View>
          {group.accounts.map((account) => (
            <Card key={account.id}>
              <View>
                <View style={styles.row}>
                  <View style={styles.left}>
                    <View style={[styles.icon, { width: layout.compact ? 40 : 44, height: layout.compact ? 40 : 44, borderRadius: layout.compact ? 20 : 22, backgroundColor: theme.colors.surfaceMuted }]}>
                      <Ionicons name={account.type === 'BANK' ? 'business-outline' : account.type === 'CASH' ? 'cash-outline' : 'wallet-outline'} size={22} color={theme.colors.primary} />
                    </View>
                    <View>
                      <AppText variant="h2">{account.name}</AppText>
                      <AppText variant="small" muted>{group.label} {account.active ? 'Active' : 'Inactive'}</AppText>
                    </View>
                  </View>
                  <View style={styles.right}>
                    <AppText variant="h2">{formatMoney(account.currentBalance)}</AppText>
                    <Pressable onPress={() => navigation.navigate('AddEditAccount', { accountId: account.id })} style={[styles.editButton, { width: layout.compact ? 32 : 34, height: layout.compact ? 32 : 34, borderRadius: layout.compact ? 16 : 17 }]}>
                      <Ionicons name="create-outline" size={18} color={theme.colors.primary} />
                    </Pressable>
                  </View>
                </View>
                <Pressable onPress={() => navigation.navigate('AccountLedger', { accountId: account.id, accountName: account.name })} style={styles.ledgerHint}>
                  <AppText variant="small" muted>View ledger</AppText>
                  <Ionicons name="chevron-forward" size={16} color={theme.colors.textMuted} />
                </Pressable>
              </View>
            </Card>
          ))}
        </View>
      ))}
      <PrimaryButton onPress={() => navigation.navigate('AddEditAccount')}>Add Account</PrimaryButton>
    </Screen>
  );
}

function buildAccountGroups(accounts: Account[]) {
  const order: AccountType[] = ['CASH', 'BANK', 'WALLET', 'OTHER'];
  const labels: Record<AccountType, string> = {
    CASH: 'Cash',
    BANK: 'Bank',
    WALLET: 'Wallet',
    OTHER: 'Other',
  };

  return order
    .map((type) => {
      const groupAccounts = accounts.filter((account) => account.type === type);
      return {
        type,
        label: labels[type],
        accounts: groupAccounts,
        total: groupAccounts.reduce((sum, account) => sum + account.currentBalance, 0),
      };
    })
    .filter((group) => group.accounts.length > 0);
}

const styles = StyleSheet.create({
  section: {
    gap: spacing.sm,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
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
  right: {
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
