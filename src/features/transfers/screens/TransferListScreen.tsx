import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { TransfersStackParamList } from '../../../app/routes/types';
import { AppText } from '../../../shared/components/AppText';
import { Card } from '../../../shared/components/Card';
import { EmptyState } from '../../../shared/components/EmptyState';
import { Header } from '../../../shared/components/Header';
import { PrimaryButton } from '../../../shared/components/PrimaryButton';
import { Screen } from '../../../shared/components/Screen';
import { colors, spacing } from '../../../shared/theme/theme';
import { currentMonth, formatMoney } from '../../../shared/utils/format';
import type { Transfer } from '../../../shared/types/api';
import { transferService } from '../services/transferService';
import { useResponsiveLayout } from '../../../shared/layout/responsive';

type Props = NativeStackScreenProps<TransfersStackParamList, 'TransferList'>;

export function TransferListScreen({ navigation }: Props) {
  const layout = useResponsiveLayout();
  const [items, setItems] = useState<Transfer[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function load() {
    try {
      setItems(await transferService.list(currentMonth()));
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
      <Header title="Transfers" subtitle="Internal movement only" rightIcon="add-outline" onRightPress={() => navigation.navigate('AddTransfer')} />
      <PrimaryButton onPress={() => navigation.navigate('AddTransfer')}>Transfer Money</PrimaryButton>
      {loading ? <ActivityIndicator color={colors.primary} /> : null}
      {!loading && items.length === 0 ? <EmptyState icon="swap-horizontal-outline" title="No transfers" message="Move money between your own accounts without affecting income or expense reports." /> : null}
      {items.map((item) => (
        <Card key={item.id}>
          <View style={styles.row}>
            <Ionicons name="swap-horizontal-outline" size={24} color={colors.transfer} />
            <View style={styles.copy}>
              <AppText>{item.fromAccountName} → {item.toAccountName}</AppText>
              <AppText variant="small" muted>{item.transferDate} · Fee {formatMoney(item.feeAmount)}</AppText>
            </View>
            <View style={styles.right}>
              <AppText>{formatMoney(item.amount)}</AppText>
              <Pressable onPress={() => navigation.navigate('AddTransfer', { transferId: item.id })} style={[styles.editButton, { width: layout.compact ? 32 : 34, height: layout.compact ? 32 : 34, borderRadius: layout.compact ? 16 : 17 }]}>
                <Ionicons name="create-outline" size={18} color={colors.primary} />
              </Pressable>
            </View>
          </View>
        </Card>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  copy: {
    flex: 1,
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
    backgroundColor: 'rgba(76,145,255,0.12)',
  },
});
