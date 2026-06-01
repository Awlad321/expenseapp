import { useCallback, useMemo, useState } from 'react';
import { Alert, Modal, Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { DebtsStackParamList } from '../../../app/routes/types';
import { AppText } from '../../../shared/components/AppText';
import { Card } from '../../../shared/components/Card';
import { DatePickerField } from '../../../shared/components/DatePickerField';
import { FormInput } from '../../../shared/components/FormInput';
import { Header } from '../../../shared/components/Header';
import { PrimaryButton } from '../../../shared/components/PrimaryButton';
import { Screen } from '../../../shared/components/Screen';
import { useTheme } from '../../../shared/theme/ThemeContext';
import { formatMoney, today } from '../../../shared/utils/format';
import type { Debt, DebtKind, DebtPayment, DebtStatus } from '../../../shared/types/api';
import { debtService } from '../services/debtService';

type Props = NativeStackScreenProps<DebtsStackParamList, 'DebtDetails'>;

export function DebtDetailsScreen({ navigation, route }: Props) {
  const { debtId } = route.params;
  const theme = useTheme();
  const [debt, setDebt] = useState<Debt | null>(null);
  const [payments, setPayments] = useState<DebtPayment[]>([]);
  const [paymentModal, setPaymentModal] = useState(false);
  const [editingPaymentId, setEditingPaymentId] = useState<number | null>(null);
  const [amount, setAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState(today());
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  async function load() {
    const [debtData, paymentData] = await Promise.all([
      debtService.get(debtId),
      debtService.listPayments(debtId),
    ]);
    setDebt(debtData);
    setPayments(paymentData.sort((a, b) => a.paymentDate.localeCompare(b.paymentDate) || a.createdAt.localeCompare(b.createdAt)));
  }

  useFocusEffect(useCallback(() => {
    load();
  }, [debtId]));

  const history = useMemo(() => {
    if (!debt) return [];
    return [
      {
        key: `borrow-${debt.id}`,
        title: `${debt.kind === 'BORROWED' ? 'Borrowed' : 'Gave'} ${formatMoney(debt.totalAmount)}`,
        subtitle: debt.description ?? debt.interestNote ?? 'Debt created',
        date: debt.borrowDate,
        remaining: debt.totalAmount,
        type: 'BORROW' as const,
      },
      ...payments.map((payment) => ({
        key: `payment-${payment.id}`,
        title: `${debt.kind === 'BORROWED' ? 'Payment' : 'Collected'} ${formatMoney(payment.amount)}`,
        subtitle: payment.note ?? (debt.kind === 'BORROWED' ? 'Installment payment' : 'Money received back'),
        date: payment.paymentDate,
        remaining: payment.remainingAfter,
        type: 'PAYMENT' as const,
        id: payment.id,
      })),
    ];
  }, [debt, payments]);

  function openAddPayment() {
    setEditingPaymentId(null);
    setAmount('');
    setPaymentDate(today());
    setNote('');
    setPaymentModal(true);
  }

  function openEditPayment(payment: DebtPayment) {
    setEditingPaymentId(payment.id);
    setAmount(`${payment.amount}`);
    setPaymentDate(payment.paymentDate);
    setNote(payment.note ?? '');
    setPaymentModal(true);
  }

  async function savePayment() {
    setSaving(true);
    try {
      const payload = { debtId, amount: Number(amount), paymentDate, note };
      if (editingPaymentId) {
        await debtService.updatePayment(editingPaymentId, payload);
      } else {
        await debtService.createPayment(payload);
      }
      setPaymentModal(false);
      await load();
    } catch {
      Alert.alert('Could not save payment', `Check the amount and date. ${debt?.kind === 'BORROWED' ? 'Payments' : 'Collected amounts'} cannot exceed the total amount.`);
    } finally {
      setSaving(false);
    }
  }

  async function deletePayment(id: number) {
    Alert.alert('Delete payment?', 'This installment record will be removed from payment history.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await debtService.removePayment(id);
          await load();
        },
      },
    ]);
  }

  async function deleteDebt() {
    Alert.alert('Delete debt?', 'This removes the debt and all installment history.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await debtService.remove(debtId);
          navigation.goBack();
        },
      },
    ]);
  }

  if (!debt) {
    return (
      <Screen>
        <Header title="Debt details" subtitle="Loading..." rightIcon="arrow-back-outline" onRightPress={() => navigation.goBack()} />
      </Screen>
    );
  }

  const palette = debtPalette(debt.status, debt.kind, theme.colors);
  const progress = debt.totalAmount > 0 ? Math.min((debt.totalPaid / debt.totalAmount) * 100, 100) : 0;

  return (
    <Screen>
      <Header title={debt.personName} subtitle={debt.kind === 'BORROWED' ? 'Borrowed money and payments' : 'Money given and collections'} rightIcon="arrow-back-outline" onRightPress={() => navigation.goBack()} />
      <Card>
        <View style={styles.topRow}>
          <View>
            <AppText variant="small" muted>{debt.kind === 'BORROWED' ? 'Remaining debt' : 'Outstanding receivable'}</AppText>
            <AppText variant="title" style={{ color: palette }}>{formatMoney(debt.remainingAmount)}</AppText>
          </View>
          <View style={styles.badges}>
            <View style={[styles.kindBadge, { backgroundColor: `${kindColor(debt.kind, theme.colors)}15` }]}>
              <AppText variant="small" style={{ color: kindColor(debt.kind, theme.colors) }}>{debt.kind === 'BORROWED' ? 'Borrowed' : 'Lent'}</AppText>
            </View>
            <View style={[styles.badge, { backgroundColor: `${palette}15` }]}>
              <AppText variant="small" style={{ color: palette }}>{statusLabel(debt.status)}</AppText>
            </View>
          </View>
        </View>
        <View style={styles.metricRow}>
          <Info label={debt.kind === 'BORROWED' ? 'Borrowed' : 'Given'} value={formatMoney(debt.totalAmount)} />
          <Info label={debt.kind === 'BORROWED' ? 'Paid' : 'Collected'} value={formatMoney(debt.totalPaid)} />
          <Info label={debt.kind === 'BORROWED' ? 'Last payment' : 'Last collected'} value={debt.lastPaymentDate ?? 'None'} />
        </View>
        <View style={[styles.track, { backgroundColor: theme.colors.surfaceMuted }]}>
          <View style={[styles.fill, { width: `${Math.max(progress, debt.totalPaid > 0 ? 4 : 0)}%`, backgroundColor: palette }]} />
        </View>
      </Card>

      <Card>
        <AppText variant="h2">Debt details</AppText>
        <InfoRow label="Type" value={debt.kind === 'BORROWED' ? 'Money I borrowed' : 'Money I gave'} />
        <InfoRow label="Phone" value={debt.phoneNumber ?? 'Not added'} />
        <InfoRow label="Borrow date" value={debt.borrowDate} />
        <InfoRow label="Due date" value={debt.dueDate ?? 'No due date'} />
        <InfoRow label="Interest note" value={debt.interestNote ?? 'None'} />
        <InfoRow label="Tag" value={debt.tag ?? 'None'} />
        <InfoRow label="Note" value={debt.description ?? 'None'} />
      </Card>

      <View style={styles.actions}>
        <PrimaryButton onPress={openAddPayment} style={styles.action}>{debt.kind === 'BORROWED' ? 'Add payment' : 'Add collection'}</PrimaryButton>
        <PrimaryButton variant="ghost" onPress={() => navigation.navigate('AddEditDebt', { debtId })} style={styles.action}>Edit debt</PrimaryButton>
      </View>

      <Card>
        <AppText variant="h2">{debt.kind === 'BORROWED' ? 'Payment history' : 'Collection history'}</AppText>
        {history.map((item) => (
          <View key={item.key} style={styles.historyRow}>
            <View style={styles.historyLeft}>
              <View style={[styles.historyIcon, { backgroundColor: item.type === 'BORROW' ? `${theme.colors.warning}16` : `${theme.colors.income}16` }]}>
                <Ionicons name={item.type === 'BORROW' ? (debt.kind === 'BORROWED' ? 'arrow-up-circle-outline' : 'arrow-down-circle-outline') : 'checkmark-circle-outline'} size={18} color={item.type === 'BORROW' ? kindColor(debt.kind, theme.colors) : theme.colors.income} />
              </View>
              <View style={styles.historyCopy}>
                <AppText>{item.title}</AppText>
                <AppText variant="small" muted>{item.date}</AppText>
                <AppText variant="small" muted>{item.subtitle}</AppText>
              </View>
            </View>
            <View style={styles.historyRight}>
              <AppText variant="small" muted>Remaining</AppText>
              <AppText>{formatMoney(item.remaining)}</AppText>
              {item.type === 'PAYMENT' ? (
                <View style={styles.paymentActions}>
                  <Pressable onPress={() => openEditPayment(payments.find((payment) => payment.id === item.id)!)} style={[styles.iconButton, { backgroundColor: theme.colors.surfaceMuted }]}>
                    <Ionicons name="create-outline" size={16} color={theme.colors.primary} />
                  </Pressable>
                  <Pressable onPress={() => deletePayment(item.id!)} style={[styles.iconButton, { backgroundColor: theme.colors.surfaceMuted }]}>
                    <Ionicons name="trash-outline" size={16} color={theme.colors.expense} />
                  </Pressable>
                </View>
              ) : null}
            </View>
          </View>
        ))}
      </Card>

      <PrimaryButton variant="danger" onPress={deleteDebt}>Delete Debt</PrimaryButton>

      <Modal visible={paymentModal} transparent animationType="fade" onRequestClose={() => setPaymentModal(false)}>
        <View style={[styles.backdrop, { backgroundColor: theme.scheme === 'dark' ? 'rgba(0,0,0,0.52)' : 'rgba(7,17,19,0.28)' }]}>
          <View style={[styles.panel, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
            <View style={styles.modalHeader}>
              <AppText variant="h2">{editingPaymentId ? `Edit ${debt.kind === 'BORROWED' ? 'payment' : 'collection'}` : `Add ${debt.kind === 'BORROWED' ? 'payment' : 'collection'}`}</AppText>
              <Pressable onPress={() => setPaymentModal(false)}><AppText variant="small" muted>Close</AppText></Pressable>
            </View>
            <FormInput label={debt.kind === 'BORROWED' ? 'Payment amount' : 'Collected amount'} value={amount} onChangeText={setAmount} keyboardType="numeric" />
            <DatePickerField label={debt.kind === 'BORROWED' ? 'Payment date' : 'Collection date'} value={paymentDate} onChange={setPaymentDate} />
            <FormInput label={debt.kind === 'BORROWED' ? 'Payment note' : 'Collection note'} value={note} onChangeText={setNote} />
            <PrimaryButton loading={saving} onPress={savePayment}>{editingPaymentId ? `Update ${debt.kind === 'BORROWED' ? 'Payment' : 'Collection'}` : `Save ${debt.kind === 'BORROWED' ? 'Payment' : 'Collection'}`}</PrimaryButton>
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metric}>
      <AppText variant="small" muted>{label}</AppText>
      <AppText>{value}</AppText>
    </View>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <AppText variant="small" muted>{label}</AppText>
      <AppText>{value}</AppText>
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
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
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
  kindBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    alignSelf: 'flex-start',
  },
  metricRow: {
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
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
  },
  action: {
    flex: 1,
  },
  historyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 8,
  },
  historyLeft: {
    flexDirection: 'row',
    gap: 12,
    flex: 1,
  },
  historyIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  historyCopy: {
    flex: 1,
    gap: 4,
  },
  historyRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  paymentActions: {
    flexDirection: 'row',
    gap: 6,
  },
  iconButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backdrop: {
    flex: 1,
    justifyContent: 'center',
    padding: 16,
  },
  panel: {
    gap: 16,
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    alignItems: 'center',
  },
});
