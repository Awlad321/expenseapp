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
  const totalBalance = groupedAccounts.reduce((sum, group) => sum + group.total, 0);
  const activeCount = accounts.filter((account) => account.active).length;

  return (
    <Screen refreshing={refreshing} onRefresh={refresh}>
      <Header title="Accounts" subtitle="Cash, bank, and wallets" rightIcon="add-outline" onRightPress={() => navigation.navigate('AddEditAccount')} />
      {loading ? <ActivityIndicator color={colors.primary} /> : null}
      {!loading && accounts.length > 0 ? (
        <Card>
          <View style={styles.heroRow}>
            <View>
              <AppText variant="small" muted>Usable balance</AppText>
              <AppText variant="title">{formatMoney(totalBalance)}</AppText>
            </View>
            <View style={styles.heroMeta}>
              <AppText variant="small" muted>{activeCount} active</AppText>
              <AppText variant="small" muted>{groupedAccounts.length} groups</AppText>
            </View>
          </View>
        </Card>
      ) : null}
      {!loading && accounts.length === 0 ? (
        <EmptyState icon="wallet-outline" title="No accounts yet" message="Create Cash, Bank, bKash, Nagad, or Rocket sources first." />
      ) : groupedAccounts.map((group) => (
        <View key={group.type} style={styles.section}>
          <Card>
            <View style={styles.groupCardHeader}>
              <View style={styles.groupHeaderLeft}>
                <View style={[styles.groupIcon, { backgroundColor: `${group.color}16` }]}>
                  <Ionicons name={group.icon} size={18} color={group.color} />
                </View>
                <View>
                  <AppText variant="h2">{group.label}</AppText>
                  <AppText variant="small" muted>{group.accounts.length} account{group.accounts.length === 1 ? '' : 's'}</AppText>
                </View>
              </View>
              <AppText style={{ color: group.color }}>{formatMoney(group.total)}</AppText>
            </View>
            {group.accounts.map((account, index) => (
              <View key={account.id} style={[styles.accountRow, index > 0 && styles.accountRowBorder, { borderTopColor: theme.colors.border }]}>
                <View style={styles.left}>
                  <View style={[styles.icon, { width: layout.compact ? 40 : 44, height: layout.compact ? 40 : 44, borderRadius: layout.compact ? 20 : 22, backgroundColor: theme.colors.surfaceMuted }]}>
                    <Ionicons name={group.icon} size={20} color={group.color} />
                  </View>
                  <View style={styles.copy}>
                    <AppText>{account.name}</AppText>
                    <AppText variant="small" muted>{account.active ? 'Active balance source' : 'Inactive balance source'}</AppText>
                  </View>
                </View>
                <View style={styles.right}>
                  <AppText>{formatMoney(account.currentBalance)}</AppText>
                  <View style={styles.actions}>
                    <Pressable onPress={() => navigation.navigate('AccountLedger', { accountId: account.id, accountName: account.name })} style={[styles.ledgerButton, { backgroundColor: theme.colors.surfaceMuted }]}>
                      <Ionicons name="reader-outline" size={16} color={theme.colors.textMuted} />
                      <AppText variant="small" muted>Ledger</AppText>
                    </Pressable>
                    <Pressable onPress={() => navigation.navigate('AddEditAccount', { accountId: account.id })} style={[styles.editButton, { width: layout.compact ? 32 : 34, height: layout.compact ? 32 : 34, borderRadius: layout.compact ? 16 : 17 }]}>
                      <Ionicons name="create-outline" size={18} color={theme.colors.primary} />
                    </Pressable>
                  </View>
                </View>
              </View>
            ))}
          </Card>
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
        icon: accountIcon(type),
        color: accountColor(type),
        accounts: groupAccounts,
        total: groupAccounts.reduce((sum, account) => sum + account.currentBalance, 0),
      };
    })
    .filter((group) => group.accounts.length > 0);
}

function accountIcon(type: AccountType): keyof typeof Ionicons.glyphMap {
  if (type === 'BANK') return 'business-outline';
  if (type === 'CASH') return 'cash-outline';
  if (type === 'WALLET') return 'wallet-outline';
  return 'layers-outline';
}

function accountColor(type: AccountType) {
  if (type === 'BANK') return colors.bank;
  if (type === 'CASH') return colors.cash;
  if (type === 'WALLET') return colors.wallet;
  return colors.primary;
}

const styles = StyleSheet.create({
  section: {
    gap: spacing.sm,
  },
  heroRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  heroMeta: {
    alignItems: 'flex-end',
    gap: spacing.xs,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  groupCardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  groupHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  groupIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  accountRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingTop: spacing.md,
    marginTop: spacing.md,
  },
  accountRowBorder: {
    borderTopWidth: 1,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'flex-start',
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
  copy: {
    flex: 1,
    gap: spacing.xs,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  ledgerButton: {
    minHeight: 32,
    borderRadius: 999,
    paddingHorizontal: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
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
