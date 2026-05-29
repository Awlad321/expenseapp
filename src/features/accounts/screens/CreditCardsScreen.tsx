import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Modal, Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { AppText } from '../../../shared/components/AppText';
import { Card } from '../../../shared/components/Card';
import { DatePickerField } from '../../../shared/components/DatePickerField';
import { EmptyState } from '../../../shared/components/EmptyState';
import { FormInput } from '../../../shared/components/FormInput';
import { Header } from '../../../shared/components/Header';
import { PrimaryButton } from '../../../shared/components/PrimaryButton';
import { Screen } from '../../../shared/components/Screen';
import { colors, radius, spacing } from '../../../shared/theme/theme';
import { useTheme } from '../../../shared/theme/ThemeContext';
import { formatMoney, today } from '../../../shared/utils/format';
import type { Account, Category, CreditCard, CreditCardActivity } from '../../../shared/types/api';
import { accountService } from '../services/accountService';
import { creditCardService } from '../services/creditCardService';
import { categoryService } from '../../categories/services/categoryService';
import { useResponsiveLayout } from '../../../shared/layout/responsive';

type ModalMode = 'CARD' | 'SPEND' | 'PAY' | 'CATEGORY' | null;

export function CreditCardsScreen() {
  const theme = useTheme();
  const layout = useResponsiveLayout();
  const [cards, setCards] = useState<CreditCard[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [activities, setActivities] = useState<CreditCardActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [mode, setMode] = useState<ModalMode>(null);
  const [editingCardId, setEditingCardId] = useState<number | null>(null);
  const [editingActivityId, setEditingActivityId] = useState<number | null>(null);
  const [selectedCardId, setSelectedCardId] = useState(0);
  const [selectedAccountId, setSelectedAccountId] = useState(0);
  const [selectedCategoryId, setSelectedCategoryId] = useState(0);
  const [name, setName] = useState('');
  const [limit, setLimit] = useState('');
  const [billingDay, setBillingDay] = useState('');
  const [dueDay, setDueDay] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(today());
  const [note, setNote] = useState('');

  async function load() {
    try {
      const [cardData, accountData, activityData] = await Promise.all([
        creditCardService.list(),
        accountService.list(),
        creditCardService.activities(),
      ]);
      const categoryData = await categoryService.list('EXPENSE');
      setCards(cardData);
      setAccounts(accountData.filter((account) => account.active));
      setCategories(categoryData);
      setActivities(activityData);
      if (!selectedCardId && cardData[0]) setSelectedCardId(cardData[0].id);
      if (!selectedAccountId && accountData[0]) setSelectedAccountId(accountData[0].id);
      if (!selectedCategoryId && categoryData[0]) setSelectedCategoryId(categoryData[0].id);
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

  function resetModal(nextMode: ModalMode) {
    setMode(nextMode);
    setEditingCardId(null);
    setEditingActivityId(null);
    setName('');
    setLimit('');
    setBillingDay('');
    setDueDay('');
    setAmount('');
    setDate(today());
    setNote('');
  }

  async function saveCard() {
    try {
      const payload = {
        name,
        creditLimit: Number(limit || 0),
        billingDay: billingDay ? Number(billingDay) : null,
        dueDay: dueDay ? Number(dueDay) : null,
      };
      if (editingCardId) {
        await creditCardService.update(editingCardId, payload);
      } else {
        await creditCardService.create(payload);
      }
      resetModal(null);
      await load();
    } catch {
      Alert.alert('Could not save card', 'Enter a card name and valid credit limit.');
    }
  }

  async function saveSpend() {
    try {
      const payload = { cardId: selectedCardId, categoryId: selectedCategoryId, amount: Number(amount), activityDate: date, note };
      if (editingActivityId) {
        await creditCardService.updateActivity(editingActivityId, payload);
      } else {
        await creditCardService.spend(payload);
      }
      resetModal(null);
      await load();
    } catch {
      Alert.alert('Could not save spend', 'Choose a card and enter a positive amount.');
    }
  }

  async function saveCategory() {
    try {
      const category = await categoryService.create({ name, type: 'EXPENSE' });
      setCategories((current) => [...current, category].sort((a, b) => a.name.localeCompare(b.name)));
      setSelectedCategoryId(category.id);
      resetModal('SPEND');
    } catch {
      Alert.alert('Could not add category', 'Enter a valid category name.');
    }
  }

  async function savePayment() {
    try {
      const payload = { cardId: selectedCardId, sourceAccountId: selectedAccountId, amount: Number(amount), activityDate: date, note };
      if (editingActivityId) {
        await creditCardService.updateActivity(editingActivityId, payload);
      } else {
        await creditCardService.pay(payload);
      }
      resetModal(null);
      await load();
    } catch {
      Alert.alert('Could not save payment', 'Check source account balance and outstanding card debt.');
    }
  }

  function startCardEdit(card: CreditCard) {
    setEditingCardId(card.id);
    setEditingActivityId(null);
    setMode('CARD');
    setName(card.name);
    setLimit(`${card.creditLimit}`);
    setBillingDay(card.billingDay ? `${card.billingDay}` : '');
    setDueDay(card.dueDay ? `${card.dueDay}` : '');
    setAmount('');
    setDate(today());
    setNote('');
  }

  function startActivityEdit(activity: CreditCardActivity) {
    setEditingCardId(null);
    setEditingActivityId(activity.id);
    setSelectedCardId(activity.cardId);
    setAmount(`${activity.amount}`);
    setDate(activity.activityDate);
    setNote(activity.note ?? '');

    if (activity.type === 'PAYMENT') {
      setMode('PAY');
      setSelectedAccountId(activity.sourceAccountId ?? 0);
    } else {
      setMode('SPEND');
      setSelectedCategoryId(activity.categoryId ?? 0);
    }
  }

  const totalDebt = cards.reduce((sum, card) => sum + card.outstandingBalance, 0);
  const totalLimit = cards.reduce((sum, card) => sum + card.creditLimit, 0);
  const totalRemaining = Math.max(totalLimit - totalDebt, 0);

  return (
    <Screen refreshing={refreshing} onRefresh={refresh}>
      <Header title="Credit Cards" subtitle="Debt tracking, separate from expenses" rightIcon="add-outline" onRightPress={() => resetModal('CARD')} />
      <Card>
        <View style={styles.summaryRow}>
          <View>
            <AppText variant="small" muted>Total card debt</AppText>
            <AppText variant="title" style={{ color: totalDebt > 0 ? colors.expense : colors.income }}>{formatMoney(totalDebt)}</AppText>
          </View>
          <View style={[styles.summaryIcon, { width: layout.compact ? 48 : 56, height: layout.compact ? 48 : 56, borderRadius: layout.compact ? 24 : 28, backgroundColor: theme.colors.surfaceMuted }]}>
            <Ionicons name="card-outline" size={28} color={theme.colors.accent} />
          </View>
        </View>
        <View style={styles.summaryMetrics}>
          <Metric label="Available limit" value={formatMoney(totalRemaining)} />
          <Metric label="Usage" value={`${Math.round((totalDebt / Math.max(totalLimit, 1)) * 100)}%`} />
          <Metric label="Total limit" value={formatMoney(totalLimit)} />
        </View>
      </Card>

      <View style={styles.actions}>
        <PrimaryButton onPress={() => resetModal('SPEND')} style={styles.action}>Spend</PrimaryButton>
        <PrimaryButton variant="secondary" onPress={() => resetModal('PAY')} style={styles.action}>Pay</PrimaryButton>
      </View>

      {loading ? <ActivityIndicator color={colors.primary} /> : null}
      {!loading && cards.length === 0 ? <EmptyState icon="card-outline" title="No credit cards" message="Add a credit card to track debt without mixing it into normal expenses." /> : null}

      {cards.map((card) => (
        <Card key={card.id}>
          <View style={styles.cardTop}>
            <View>
              <AppText variant="h2">{card.name}</AppText>
              <AppText variant="small" muted>Limit {formatMoney(card.creditLimit)}</AppText>
            </View>
            <View style={styles.cardActions}>
              <AppText style={{ color: card.outstandingBalance > 0 ? colors.expense : colors.income }}>{formatMoney(card.outstandingBalance)}</AppText>
              <Pressable onPress={() => startCardEdit(card)} style={[styles.editButton, { width: layout.compact ? 32 : 34, height: layout.compact ? 32 : 34, borderRadius: layout.compact ? 16 : 17 }]}>
                <Ionicons name="create-outline" size={18} color={theme.colors.primary} />
              </Pressable>
            </View>
          </View>
          <View style={styles.cardMetrics}>
            <Metric label="Outstanding" value={formatMoney(card.outstandingBalance)} />
            <Metric label="Remaining" value={formatMoney(card.creditLimit - card.outstandingBalance)} />
            <Metric label="Use" value={`${Math.round((card.outstandingBalance / Math.max(card.creditLimit, 1)) * 100)}%`} />
          </View>
          {(card.billingDay || card.dueDay || lastPayment(card.id, activities)) ? (
            <View style={styles.metaRow}>
              {card.billingDay ? <MetaPill label={`Billing ${ordinal(card.billingDay)}`} /> : null}
              {card.dueDay ? <MetaPill label={`Due ${ordinal(card.dueDay)}`} /> : null}
              {lastPayment(card.id, activities) ? (
                <MetaPill label={`Last pay ${formatMoney(lastPayment(card.id, activities)!.amount)}`} />
              ) : null}
            </View>
          ) : null}
          <View style={styles.track}>
            <View style={[styles.fill, { width: `${Math.min((card.outstandingBalance / Math.max(card.creditLimit, 1)) * 100, 100)}%` }]} />
          </View>
        </Card>
      ))}

      <Card>
        <AppText variant="h2">Recent card activity</AppText>
        {activities.slice(0, 8).map((activity) => (
          <View key={activity.id} style={styles.activityRow}>
            <View style={styles.left}>
              <View style={[styles.activityIcon, { backgroundColor: activity.type === 'PAYMENT' ? 'rgba(54,211,153,0.13)' : 'rgba(255,122,122,0.13)' }]}>
                <Ionicons name={activity.type === 'PAYMENT' ? 'arrow-down-circle-outline' : 'arrow-up-circle-outline'} size={20} color={activity.type === 'PAYMENT' ? colors.income : colors.expense} />
              </View>
              <View style={styles.copy}>
                <AppText>{activity.type === 'PAYMENT' ? 'Payment' : activity.categoryName ?? 'Spend'} · {activity.cardName}</AppText>
                <AppText variant="small" muted>{activity.sourceAccountName ?? activity.activityDate}</AppText>
              </View>
            </View>
            <View style={styles.amounts}>
              <AppText style={{ color: activity.type === 'PAYMENT' ? colors.income : colors.expense }}>
                {activity.type === 'PAYMENT' ? '-' : '+'}{formatMoney(activity.amount)}
              </AppText>
              <AppText variant="small" muted>Debt {formatMoney(activity.balanceAfter)}</AppText>
              <Pressable onPress={() => startActivityEdit(activity)} style={[styles.editButton, { width: layout.compact ? 32 : 34, height: layout.compact ? 32 : 34, borderRadius: layout.compact ? 16 : 17 }]}>
                <Ionicons name="create-outline" size={18} color={theme.colors.primary} />
              </Pressable>
            </View>
          </View>
        ))}
        {activities.length === 0 ? <AppText muted>No card activity yet.</AppText> : null}
      </Card>

      <Modal visible={mode !== null} transparent animationType="fade" onRequestClose={() => resetModal(null)}>
        <View style={[styles.backdrop, { backgroundColor: theme.scheme === 'dark' ? 'rgba(0,0,0,0.52)' : 'rgba(7,17,19,0.28)' }]}>
          <View style={[styles.panel, { width: '100%', maxWidth: layout.tablet ? 560 : 440, padding: layout.compact ? spacing.md : spacing.lg, backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
            <View style={styles.modalHeader}>
              <AppText variant="h2">
                {mode === 'CARD'
                  ? editingCardId ? 'Edit credit card' : 'Add credit card'
                  : mode === 'SPEND'
                    ? editingActivityId ? 'Edit card spending' : 'Card spending'
                    : mode === 'CATEGORY'
                      ? 'Add category'
                      : editingActivityId ? 'Edit card payment' : 'Card payment'}
              </AppText>
              <Pressable onPress={() => resetModal(null)}><AppText variant="small" muted>Close</AppText></Pressable>
            </View>

            {mode === 'CARD' ? (
              <>
                <FormInput label="Card name" value={name} onChangeText={setName} />
                <FormInput label="Credit limit" keyboardType="numeric" value={limit} onChangeText={setLimit} />
                <View style={styles.inlineFields}>
                  <View style={styles.inlineField}>
                    <FormInput label="Billing day" keyboardType="numeric" value={billingDay} onChangeText={setBillingDay} />
                  </View>
                  <View style={styles.inlineField}>
                    <FormInput label="Due day" keyboardType="numeric" value={dueDay} onChangeText={setDueDay} />
                  </View>
                </View>
                <PrimaryButton onPress={saveCard}>{editingCardId ? 'Update Card' : 'Save Card'}</PrimaryButton>
              </>
            ) : mode === 'CATEGORY' ? (
              <>
                <FormInput label="Category name" value={name} onChangeText={setName} />
                <PrimaryButton onPress={saveCategory}>Save Category</PrimaryButton>
              </>
            ) : (
              <>
                <ChoiceRow title="Card" items={cards.map((card) => ({ id: card.id, label: card.name }))} selectedId={selectedCardId} onSelect={setSelectedCardId} />
                {mode === 'SPEND' ? (
                  <ChoiceRow
                    title="Category"
                    actionLabel="Add category"
                    onAction={() => resetModal('CATEGORY')}
                    items={categories.map((category) => ({ id: category.id, label: category.name }))}
                    selectedId={selectedCategoryId}
                    onSelect={setSelectedCategoryId}
                  />
                ) : null}
                {mode === 'PAY' ? <ChoiceRow title="Pay from" items={accounts.map((account) => ({ id: account.id, label: account.name }))} selectedId={selectedAccountId} onSelect={setSelectedAccountId} /> : null}
                <FormInput label="Amount" keyboardType="numeric" value={amount} onChangeText={setAmount} />
                <DatePickerField label="Date" value={date} onChange={setDate} />
                <FormInput label="Note" value={note} onChangeText={setNote} />
                <PrimaryButton onPress={mode === 'SPEND' ? saveSpend : savePayment}>
                  {mode === 'SPEND'
                    ? editingActivityId ? 'Update Spend' : 'Record Spend'
                    : editingActivityId ? 'Update Payment' : 'Record Payment'}
                </PrimaryButton>
              </>
            )}
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metric}>
      <AppText variant="small" muted>{label}</AppText>
      <AppText>{value}</AppText>
    </View>
  );
}

function MetaPill({ label }: { label: string }) {
  return (
    <View style={styles.metaPill}>
      <AppText variant="small" muted>{label}</AppText>
    </View>
  );
}

function lastPayment(cardId: number, activities: CreditCardActivity[]) {
  return activities.find((activity) => activity.cardId === cardId && activity.type === 'PAYMENT');
}

function ordinal(value: number) {
  const mod10 = value % 10;
  const mod100 = value % 100;
  if (mod10 === 1 && mod100 !== 11) return `${value}st`;
  if (mod10 === 2 && mod100 !== 12) return `${value}nd`;
  if (mod10 === 3 && mod100 !== 13) return `${value}rd`;
  return `${value}th`;
}

function ChoiceRow({
  title,
  actionLabel,
  onAction,
  items,
  selectedId,
  onSelect,
}: {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
  items: Array<{ id: number; label: string }>;
  selectedId: number;
  onSelect: (id: number) => void;
}) {
  return (
    <View style={styles.choiceBlock}>
      <View style={styles.choiceHeader}>
        <AppText variant="small" muted>{title}</AppText>
        {actionLabel && onAction ? (
          <Pressable onPress={onAction} hitSlop={8}>
            <AppText variant="small" style={styles.actionText}>{actionLabel}</AppText>
          </Pressable>
        ) : null}
      </View>
      <View style={styles.chips}>
        {items.map((item) => {
          const selected = selectedId === item.id;
          return (
            <PrimaryButton compact key={item.id} variant={selected ? 'primary' : 'ghost'} onPress={() => onSelect(item.id)} style={styles.chip}>
              {item.label}
            </PrimaryButton>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  summaryIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryMetrics: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  action: {
    flex: 1,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  cardActions: {
    alignItems: 'flex-end',
    gap: spacing.sm,
  },
  cardMetrics: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  metric: {
    flex: 1,
    gap: spacing.xs,
  },
  track: {
    height: 8,
    borderRadius: 8,
    backgroundColor: colors.surfaceMuted,
    overflow: 'hidden',
  },
  fill: {
    height: 8,
    borderRadius: 8,
    backgroundColor: colors.expense,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  metaPill: {
    borderRadius: 999,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    backgroundColor: colors.surfaceMuted,
  },
  activityRow: {
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
  activityIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
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
  editButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(20,158,110,0.10)',
  },
  backdrop: {
    flex: 1,
    justifyContent: 'center',
    padding: spacing.lg,
    backgroundColor: 'rgba(0,0,0,0.72)',
  },
  panel: {
    gap: spacing.lg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    padding: spacing.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.md,
  },
  choiceBlock: {
    gap: spacing.sm,
  },
  choiceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  actionText: {
    color: colors.primary,
  },
  inlineFields: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  inlineField: {
    flex: 1,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  chip: {
    minHeight: 40,
    borderRadius: radius.sm,
  },
});
