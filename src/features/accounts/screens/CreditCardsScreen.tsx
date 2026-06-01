import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
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
import { SegmentedControl } from '../../../shared/components/SegmentedControl';
import { colors, radius, spacing } from '../../../shared/theme/theme';
import { useTheme } from '../../../shared/theme/ThemeContext';
import { formatMoney, today } from '../../../shared/utils/format';
import type { Account, Category, CreditCard, CreditCardActivity, CreditCardEmi, CreditCardEmiPayment } from '../../../shared/types/api';
import { accountService } from '../services/accountService';
import { creditCardService } from '../services/creditCardService';
import { categoryService } from '../../categories/services/categoryService';
import { useResponsiveLayout } from '../../../shared/layout/responsive';

type ModalMode = 'CARD' | 'SPEND' | 'PAY' | 'CATEGORY' | 'EMI' | 'EMI_PAYMENT' | 'EMI_DETAIL' | null;
type EmiFilter = 'ALL' | 'ACTIVE' | 'COMPLETED' | 'OVERDUE';
type EmiModeValue = 'LIVE' | 'BACKFILL';
type EmiPaymentImpact = 'HISTORY' | 'CURRENT';

export function CreditCardsScreen() {
  const theme = useTheme();
  const layout = useResponsiveLayout();
  const [cards, setCards] = useState<CreditCard[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [activities, setActivities] = useState<CreditCardActivity[]>([]);
  const [emis, setEmis] = useState<CreditCardEmi[]>([]);
  const [emiPayments, setEmiPayments] = useState<CreditCardEmiPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [mode, setMode] = useState<ModalMode>(null);
  const [editingCardId, setEditingCardId] = useState<number | null>(null);
  const [editingActivityId, setEditingActivityId] = useState<number | null>(null);
  const [editingEmiId, setEditingEmiId] = useState<number | null>(null);
  const [editingEmiPaymentId, setEditingEmiPaymentId] = useState<number | null>(null);
  const [selectedCardId, setSelectedCardId] = useState(0);
  const [selectedAccountId, setSelectedAccountId] = useState(0);
  const [selectedCategoryId, setSelectedCategoryId] = useState(0);
  const [selectedEmiId, setSelectedEmiId] = useState(0);
  const [name, setName] = useState('');
  const [limit, setLimit] = useState('');
  const [billingDay, setBillingDay] = useState('');
  const [dueDay, setDueDay] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(today());
  const [note, setNote] = useState('');
  const [categoryPickerVisible, setCategoryPickerVisible] = useState(false);
  const [categorySearch, setCategorySearch] = useState('');
  const [emiSearch, setEmiSearch] = useState('');
  const [emiFilter, setEmiFilter] = useState<EmiFilter>('ALL');
  const [merchantName, setMerchantName] = useState('');
  const [installmentAmount, setInstallmentAmount] = useState('');
  const [totalInstallments, setTotalInstallments] = useState('');
  const [emiMode, setEmiMode] = useState<EmiModeValue>('BACKFILL');
  const [emiPaymentImpact, setEmiPaymentImpact] = useState<EmiPaymentImpact>('HISTORY');

  async function load() {
    try {
      const [cardData, accountData, activityData, emiData, emiPaymentData] = await Promise.all([
        creditCardService.list(),
        accountService.list(),
        creditCardService.activities(),
        creditCardService.emis(),
        creditCardService.emiPayments(),
      ]);
      const categoryData = await categoryService.list('EXPENSE');
      setCards(cardData);
      setAccounts(accountData.filter((account) => account.active));
      setCategories(categoryData);
      setActivities(activityData);
      setEmis(emiData);
      setEmiPayments(emiPaymentData);
      if (!selectedCardId && cardData[0]) setSelectedCardId(cardData[0].id);
      if (!selectedAccountId && accountData[0]) setSelectedAccountId(accountData[0].id);
      if (!selectedCategoryId && categoryData[0]) setSelectedCategoryId(categoryData[0].id);
      if (!selectedEmiId && emiData[0]) setSelectedEmiId(emiData[0].id);
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
    setEditingEmiId(null);
    setEditingEmiPaymentId(null);
    setName('');
    setLimit('');
    setBillingDay('');
    setDueDay('');
    setAmount('');
    setDate(today());
    setNote('');
    setMerchantName('');
    setInstallmentAmount('');
    setTotalInstallments('');
    setEmiMode('BACKFILL');
    setEmiPaymentImpact('HISTORY');
    setCategorySearch('');
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
    } catch (error) {
      Alert.alert('Could not save card', getErrorMessage(error, 'Enter a card name and valid credit limit.'));
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
    } catch (error) {
      Alert.alert('Could not save spend', getErrorMessage(error, 'Choose a card and enter a positive amount.'));
    }
  }

  async function saveCategory() {
    try {
      const category = await categoryService.create({ name, type: 'EXPENSE' });
      setCategories((current) => [...current, category].sort((a, b) => a.name.localeCompare(b.name)));
      setSelectedCategoryId(category.id);
      resetModal('SPEND');
    } catch (error) {
      Alert.alert('Could not add category', getErrorMessage(error, 'Enter a valid category name.'));
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
    } catch (error) {
      Alert.alert('Could not save payment', getErrorMessage(error, 'Check source account balance and outstanding card debt.'));
    }
  }

  async function saveEmi() {
    try {
      const payload = {
        cardId: selectedCardId,
        mode: emiMode,
        title: name,
        merchantName,
        originalAmount: Number(amount),
        installmentAmount: Number(installmentAmount),
        totalInstallments: Number(totalInstallments),
        startDate: date,
        dueDate: dueDay ? dueDay : undefined,
        note,
      };
      if (editingEmiId) {
        await creditCardService.updateEmi(editingEmiId, payload);
      } else {
        await creditCardService.createEmi(payload);
      }
      resetModal(null);
      await load();
    } catch (error) {
      Alert.alert('Could not save EMI', getErrorMessage(error, 'Check the card, amount, installment amount, count, and due date.'));
    }
  }

  async function saveEmiPayment() {
    try {
      const payload = {
        emiId: selectedEmiId,
        amount: Number(amount),
        affectsOutstanding: emiPaymentImpact === 'CURRENT',
        paymentDate: date,
        note,
      };
      if (editingEmiPaymentId) {
        await creditCardService.updateEmiPayment(editingEmiPaymentId, payload);
      } else {
        await creditCardService.createEmiPayment(payload);
      }
      resetModal(null);
      await load();
    } catch (error) {
      Alert.alert('Could not save EMI payment', getErrorMessage(error, 'Check the amount against the remaining EMI balance.'));
    }
  }

  function confirmDeleteCard(card: CreditCard) {
    Alert.alert('Delete credit card', `Delete ${card.name}? This hides the card but keeps its history.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await creditCardService.remove(card.id);
            await load();
          } catch {
            Alert.alert('Could not delete card', 'Clear outstanding balance before deleting the card.');
          }
        },
      },
    ]);
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

  function startEmiCreate(card: CreditCard) {
    resetModal('EMI');
    setSelectedCardId(card.id);
  }

  function startEmiEdit(emi: CreditCardEmi) {
    setMode('EMI');
    setEditingEmiId(emi.id);
    setSelectedCardId(emi.cardId);
    setSelectedEmiId(emi.id);
    setName(emi.title);
    setMerchantName(emi.merchantName ?? '');
    setAmount(`${emi.originalAmount}`);
    setInstallmentAmount(`${effectiveInstallmentAmount(emi)}`);
    setTotalInstallments(`${emi.totalInstallments}`);
    setEmiMode(emi.mode);
    setDate(emi.startDate);
    setDueDay(emi.dueDate ?? '');
    setNote(emi.note ?? '');
  }

  function startEmiPaymentCreate(emi: CreditCardEmi) {
    resetModal('EMI_PAYMENT');
    setSelectedCardId(emi.cardId);
    setSelectedEmiId(emi.id);
    setEmiPaymentImpact(emi.mode === 'BACKFILL' ? 'HISTORY' : 'CURRENT');
  }

  function openEmiDetail(emi: CreditCardEmi) {
    setMode('EMI_DETAIL');
    setSelectedCardId(emi.cardId);
    setSelectedEmiId(emi.id);
  }

  function startEmiPaymentEdit(payment: CreditCardEmiPayment) {
    setMode('EMI_PAYMENT');
    setEditingEmiPaymentId(payment.id);
    setSelectedEmiId(payment.emiId);
    setAmount(`${payment.amount}`);
    setEmiPaymentImpact(payment.affectsOutstanding ? 'CURRENT' : 'HISTORY');
    setDate(payment.paymentDate);
    setNote(payment.note ?? '');
  }

  function confirmDeleteEmi(emi: CreditCardEmi) {
    Alert.alert('Delete EMI', `Delete ${emi.title}? Remaining balance will be reversed from the card.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await creditCardService.removeEmi(emi.id);
            await load();
          } catch {
            Alert.alert('Could not delete EMI', 'Try again.');
          }
        },
      },
    ]);
  }

  function confirmDeleteEmiPayment(payment: CreditCardEmiPayment) {
    Alert.alert('Delete EMI payment', 'This will add the payment amount back into card outstanding.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await creditCardService.removeEmiPayment(payment.id);
            await load();
          } catch {
            Alert.alert('Could not delete EMI payment', 'Try again.');
          }
        },
      },
    ]);
  }

  const totalDebt = cards.reduce((sum, card) => sum + card.outstandingBalance, 0);
  const totalLimit = cards.reduce((sum, card) => sum + card.creditLimit, 0);
  const totalRemaining = Math.max(totalLimit - totalDebt, 0);
  const selectedCategory = categories.find((category) => category.id === selectedCategoryId);
  const recentCategoryIds = useMemo(() => buildRecentCategoryIds(activities), [activities]);
  const frequentCategoryIds = useMemo(() => buildFrequentCategoryIds(activities), [activities]);
  const recentCategories = categories.filter((category) => recentCategoryIds.includes(category.id)).sort((a, b) => recentCategoryIds.indexOf(a.id) - recentCategoryIds.indexOf(b.id));
  const frequentCategories = categories
    .filter((category) => !recentCategoryIds.includes(category.id) && frequentCategoryIds.includes(category.id))
    .sort((a, b) => frequentCategoryIds.indexOf(a.id) - frequentCategoryIds.indexOf(b.id));
  const otherCategories = categories.filter((category) => !recentCategoryIds.includes(category.id) && !frequentCategoryIds.includes(category.id));
  const trimmedCategorySearch = categorySearch.trim().toLowerCase();
  const searchedCategories = categories.filter((category) => category.name.toLowerCase().includes(trimmedCategorySearch));
  const showSearchResults = trimmedCategorySearch.length > 0;
  const visibleEmis = emis.filter((emi) => {
    const matchesSearch = emi.title.toLowerCase().includes(emiSearch.trim().toLowerCase()) || (emi.merchantName ?? '').toLowerCase().includes(emiSearch.trim().toLowerCase());
    const matchesFilter = emiFilter === 'ALL'
      || (emiFilter === 'ACTIVE' && (emi.status === 'ACTIVE' || emi.status === 'PARTIALLY_PAID'))
      || (emiFilter === 'COMPLETED' && emi.status === 'COMPLETED')
      || (emiFilter === 'OVERDUE' && emi.status === 'OVERDUE');
    return matchesSearch && matchesFilter;
  });
  const selectedEmi = emis.find((emi) => emi.id === selectedEmiId) ?? null;
  const selectedEmiPayments = selectedEmi ? emiPayments.filter((payment) => payment.emiId === selectedEmi.id) : [];

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
      <Card>
        <View style={styles.choiceHeader}>
          <AppText variant="h2">EMI Manager</AppText>
          <View style={styles.metaRow}>
            {(['ALL', 'ACTIVE', 'COMPLETED', 'OVERDUE'] as EmiFilter[]).map((value) => (
              <PrimaryButton compact key={value} variant={emiFilter === value ? 'primary' : 'ghost'} onPress={() => setEmiFilter(value)} style={styles.filterChip}>
                {value === 'ALL' ? 'All' : value === 'COMPLETED' ? 'Paid' : value === 'ACTIVE' ? 'Active' : 'Overdue'}
              </PrimaryButton>
            ))}
          </View>
        </View>
        <FormInput label="Search EMI" value={emiSearch} onChangeText={setEmiSearch} placeholder="Title or merchant" />
      </Card>

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
              <View style={styles.iconActions}>
                <Pressable onPress={() => startCardEdit(card)} style={[styles.editButton, { width: layout.compact ? 32 : 34, height: layout.compact ? 32 : 34, borderRadius: layout.compact ? 16 : 17 }]}>
                  <Ionicons name="create-outline" size={18} color={theme.colors.primary} />
                </Pressable>
                <Pressable onPress={() => confirmDeleteCard(card)} style={styles.smallIconButton}>
                  <Ionicons name="trash-outline" size={16} color={colors.expense} />
                </Pressable>
              </View>
            </View>
          </View>
          <View style={styles.cardMetrics}>
            <Metric label="Outstanding" value={formatMoney(card.outstandingBalance)} />
            <Metric label="Remaining" value={formatMoney(card.creditLimit - card.outstandingBalance)} />
            <Metric label="Use" value={`${Math.round((card.outstandingBalance / Math.max(card.creditLimit, 1)) * 100)}%`} />
          </View>
          <View style={styles.cardMetrics}>
            <Metric label="Active EMI" value={`${visibleEmis.filter((emi) => emi.cardId === card.id && emi.status !== 'COMPLETED').length}`} />
            <Metric label="Monthly EMI" value={formatMoney(visibleEmis.filter((emi) => emi.cardId === card.id && emi.status !== 'COMPLETED').reduce((sum, emi) => sum + emi.installmentAmount, 0))} />
            <Metric label="EMI remain" value={formatMoney(visibleEmis.filter((emi) => emi.cardId === card.id).reduce((sum, emi) => sum + emi.remainingAmount, 0))} />
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
          <View style={styles.emiHeader}>
            <View style={styles.copy}>
              <AppText variant="small" muted>EMIs on this card</AppText>
              <AppText variant="small" muted>Track ongoing installments separately from card spending.</AppText>
            </View>
            <PrimaryButton compact onPress={() => startEmiCreate(card)} style={styles.addEmiButton}>
              Add EMI
            </PrimaryButton>
          </View>
          {visibleEmis.filter((emi) => emi.cardId === card.id).map((emi) => {
            return (
              <Pressable
                key={emi.id}
                onPress={() => openEmiDetail(emi)}
                style={[styles.emiCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
              >
                <View style={styles.cardTop}>
                  <View style={styles.copy}>
                    <AppText>{emi.title}</AppText>
                    <AppText variant="small" muted>{emi.merchantName ?? emi.cardName}</AppText>
                  </View>
                  <View style={styles.cardActions}>
                    <StatusPill status={emi.status} />
                    <View style={styles.iconActions}>
                      <Pressable onPress={() => startEmiEdit(emi)} style={[styles.smallIconButton, { backgroundColor: theme.colors.surfaceMuted }]}>
                        <Ionicons name="create-outline" size={16} color={theme.colors.primary} />
                      </Pressable>
                      <Pressable onPress={() => confirmDeleteEmi(emi)} style={[styles.smallIconButton, { backgroundColor: theme.colors.surfaceMuted }]}>
                        <Ionicons name="trash-outline" size={16} color={colors.expense} />
                      </Pressable>
                    </View>
                  </View>
                </View>
                <View style={styles.cardMetrics}>
                  <Metric label="Monthly" value={formatMoney(effectiveInstallmentAmount(emi))} />
                  <Metric label="Paid EMI" value={`${emi.paidInstallments}/${emi.totalInstallments}`} />
                  <Metric label="Remaining" value={formatMoney(emi.remainingAmount)} />
                </View>
                <View style={styles.metaRow}>
                  <MetaPill label={emi.mode === 'BACKFILL' ? 'Existing EMI' : 'New EMI'} />
                  <MetaPill label={`Due ${emi.dueDate ?? 'Not set'}`} />
                  <MetaPill label={`${emi.remainingInstallments} left`} />
                  {emi.lastPaymentDate ? <MetaPill label={`Last ${emi.lastPaymentDate}`} /> : null}
                </View>
                <View style={[styles.track, { backgroundColor: theme.colors.surfaceMuted }]}>
                  <View style={[styles.emiFill, { width: `${emi.progressPercent}%` }]} />
                </View>
                <View style={styles.choiceHeader}>
                  <AppText variant="small" muted>{emi.lastPaymentDate ? `Last payment ${emi.lastPaymentDate}` : 'No payments yet'}</AppText>
                  <AppText variant="small" style={styles.actionText}>Open</AppText>
                </View>
              </Pressable>
            );
          })}
          {visibleEmis.filter((emi) => emi.cardId === card.id).length === 0 ? <AppText variant="small" muted>No EMIs on this card.</AppText> : null}
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
                      : mode === 'EMI'
                        ? editingEmiId ? 'Edit EMI' : 'Add EMI'
                        : mode === 'EMI_PAYMENT'
                          ? editingEmiPaymentId ? 'Edit EMI payment' : 'Add EMI payment'
                          : mode === 'EMI_DETAIL'
                            ? 'EMI details'
                          : editingActivityId ? 'Edit card payment' : 'Card payment'}
              </AppText>
              <Pressable onPress={() => resetModal(null)}><AppText variant="small" muted>Close</AppText></Pressable>
            </View>
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.modalScrollContent}
              keyboardShouldPersistTaps="handled"
            >
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
                    <View style={styles.choiceBlock}>
                      <View style={styles.choiceHeader}>
                        <AppText variant="small" muted>Category</AppText>
                        <View style={styles.headerActions}>
                          <Pressable onPress={() => {
                            setCategoryPickerVisible(true);
                            setCategorySearch('');
                          }} hitSlop={8}>
                            <AppText variant="small" style={styles.actionText}>{selectedCategory ? 'Change' : 'Choose'}</AppText>
                          </Pressable>
                          <Pressable onPress={() => resetModal('CATEGORY')} hitSlop={8}>
                            <AppText variant="small" style={styles.actionText}>Add</AppText>
                          </Pressable>
                        </View>
                      </View>
                      <Pressable
                        onPress={() => {
                          setCategoryPickerVisible(true);
                          setCategorySearch('');
                        }}
                        style={[styles.selectorField, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
                      >
                        <View style={styles.selectorContent}>
                          <View style={[styles.selectorIcon, { backgroundColor: theme.colors.surfaceMuted }]}>
                            <Ionicons name="pricetag-outline" size={18} color={theme.colors.expense} />
                          </View>
                          <View style={styles.selectorCopy}>
                            <AppText>{selectedCategory?.name ?? 'Select spending category'}</AppText>
                            <AppText variant="small" muted>{selectedCategory ? 'Search to change category' : 'Recent and frequent categories appear first'}</AppText>
                          </View>
                          <Ionicons name="chevron-down" size={18} color={theme.colors.textMuted} />
                        </View>
                      </Pressable>
                    </View>
                  ) : null}
                  {mode === 'PAY' ? <ChoiceRow title="Pay from" items={accounts.map((account) => ({ id: account.id, label: account.name }))} selectedId={selectedAccountId} onSelect={setSelectedAccountId} /> : null}
                  {mode === 'EMI' ? (
                    <>
                      <View style={styles.choiceBlock}>
                        <AppText variant="small" muted>EMI type</AppText>
                        <SegmentedControl
                          compact
                          options={[
                            { label: 'Existing EMI', value: 'BACKFILL' },
                            { label: 'New purchase', value: 'LIVE' },
                          ]}
                          value={emiMode}
                          onChange={(value) => setEmiMode(value as EmiModeValue)}
                        />
                      </View>
                      <AppText variant="small" muted>
                        {emiMode === 'BACKFILL'
                          ? 'Use this when the EMI is already part of the current card bill.'
                          : 'Use this when this EMI should increase the current card outstanding.'}
                      </AppText>
                      <FormInput label="EMI title" value={name} onChangeText={setName} />
                      <FormInput label="Merchant / item" value={merchantName} onChangeText={setMerchantName} />
                      <FormInput label="Original amount" keyboardType="numeric" value={amount} onChangeText={setAmount} />
                      <View style={styles.inlineFields}>
                        <View style={styles.inlineField}>
                          <FormInput label="EMI amount" keyboardType="numeric" value={installmentAmount} onChangeText={setInstallmentAmount} />
                        </View>
                        <View style={styles.inlineField}>
                          <FormInput label="Total EMI" keyboardType="numeric" value={totalInstallments} onChangeText={setTotalInstallments} />
                        </View>
                      </View>
                      <DatePickerField label="EMI start date" value={date} onChange={setDate} />
                      <DatePickerField label="Due date" value={dueDay || date} onChange={setDueDay} />
                      <FormInput label="Note" value={note} onChangeText={setNote} />
                      <PrimaryButton onPress={saveEmi}>{editingEmiId ? 'Update EMI' : 'Save EMI'}</PrimaryButton>
                    </>
                  ) : mode === 'EMI_PAYMENT' ? (
                    <>
                      <ChoiceRow title="EMI" items={emis.map((emi) => ({ id: emi.id, label: emi.title }))} selectedId={selectedEmiId} onSelect={setSelectedEmiId} />
                      <View style={styles.choiceBlock}>
                        <AppText variant="small" muted>Payment impact</AppText>
                        <SegmentedControl
                          compact
                          options={[
                            { label: 'History only', value: 'HISTORY' },
                            { label: 'Reduce bill', value: 'CURRENT' },
                          ]}
                          value={emiPaymentImpact}
                          onChange={(value) => setEmiPaymentImpact(value as EmiPaymentImpact)}
                        />
                      </View>
                      <AppText variant="small" muted>
                        {emiPaymentImpact === 'HISTORY'
                          ? 'Use this for old payments that are already reflected in the current bill.'
                          : 'Use this for a new payment that should reduce the current card outstanding.'}
                      </AppText>
                      <FormInput label="Payment amount" keyboardType="numeric" value={amount} onChangeText={setAmount} />
                      <DatePickerField label="Payment date" value={date} onChange={setDate} />
                      <FormInput label="Note" value={note} onChangeText={setNote} />
                      <PrimaryButton onPress={saveEmiPayment}>{editingEmiPaymentId ? 'Update EMI Payment' : 'Record EMI Payment'}</PrimaryButton>
                    </>
                  ) : mode === 'EMI_DETAIL' ? (
                    selectedEmi ? (
                      <>
                        <View style={[styles.emiDetailHero, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                          <View style={styles.cardTop}>
                            <View style={styles.copy}>
                              <AppText variant="h2">{selectedEmi.title}</AppText>
                              <AppText variant="small" muted>{selectedEmi.merchantName ?? selectedEmi.cardName}</AppText>
                            </View>
                            <StatusPill status={selectedEmi.status} />
                          </View>
                          <View style={styles.cardMetrics}>
                            <Metric label="Monthly" value={formatMoney(effectiveInstallmentAmount(selectedEmi))} />
                            <Metric label="Paid EMI" value={`${selectedEmi.paidInstallments}/${selectedEmi.totalInstallments}`} />
                            <Metric label="Remaining" value={formatMoney(selectedEmi.remainingAmount)} />
                          </View>
                          <View style={styles.metaRow}>
                            <MetaPill label={selectedEmi.mode === 'BACKFILL' ? 'Existing EMI' : 'New EMI'} />
                            <MetaPill label={`Due ${selectedEmi.dueDate ?? 'Not set'}`} />
                            <MetaPill label={`${selectedEmi.remainingInstallments} EMI left`} />
                            {selectedEmi.lastPaymentDate ? <MetaPill label={`Last ${selectedEmi.lastPaymentDate}`} /> : null}
                          </View>
                          <View style={[styles.track, { backgroundColor: theme.colors.surfaceMuted }]}>
                            <View style={[styles.emiFill, { width: `${selectedEmi.progressPercent}%` }]} />
                          </View>
                        </View>
                        <View style={styles.modalActions}>
                          <PrimaryButton variant="ghost" onPress={() => startEmiEdit(selectedEmi)} style={styles.modalButton}>Edit EMI</PrimaryButton>
                          <PrimaryButton onPress={() => startEmiPaymentCreate(selectedEmi)} style={styles.modalButton}>Add Payment</PrimaryButton>
                        </View>
                        <View style={styles.choiceBlock}>
                          <AppText variant="small" muted>Payment history</AppText>
                          <ScrollView style={styles.paymentHistoryScroll} contentContainerStyle={styles.paymentHistoryContent}>
                            {selectedEmiPayments.map((payment) => (
                              <View key={payment.id} style={[styles.paymentRow, { borderBottomColor: theme.colors.border }]}>
                                <View style={styles.copy}>
                                  <AppText>{payment.paymentDate}</AppText>
                                  <AppText variant="small" muted>
                                    {formatMoney(payment.amount)} · Remaining {formatMoney(payment.remainingAfter)} · {payment.remainingInstallmentsAfter} EMI left
                                  </AppText>
                                </View>
                                <View style={styles.iconActions}>
                                  <Pressable onPress={() => startEmiPaymentEdit(payment)} style={[styles.smallIconButton, { backgroundColor: theme.colors.surfaceMuted }]}>
                                    <Ionicons name="create-outline" size={16} color={theme.colors.primary} />
                                  </Pressable>
                                  <Pressable onPress={() => confirmDeleteEmiPayment(payment)} style={[styles.smallIconButton, { backgroundColor: theme.colors.surfaceMuted }]}>
                                    <Ionicons name="trash-outline" size={16} color={colors.expense} />
                                  </Pressable>
                                </View>
                              </View>
                            ))}
                            {selectedEmiPayments.length === 0 ? <AppText variant="small" muted>No EMI payments yet.</AppText> : null}
                          </ScrollView>
                        </View>
                      </>
                    ) : null
                  ) : (
                    <>
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
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
      <Modal visible={categoryPickerVisible} transparent animationType="fade" onRequestClose={() => setCategoryPickerVisible(false)}>
        <View style={[styles.backdrop, { backgroundColor: theme.scheme === 'dark' ? 'rgba(0,0,0,0.52)' : 'rgba(7,17,19,0.28)' }]}>
          <View style={[styles.panel, styles.pickerPanel, { width: '100%', maxWidth: layout.tablet ? 560 : 440, padding: layout.compact ? spacing.md : spacing.lg, backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
            <View style={styles.modalHeader}>
              <AppText variant="h2">Select category</AppText>
              <View style={styles.headerActions}>
                <Pressable onPress={() => {
                  setCategoryPickerVisible(false);
                  resetModal('CATEGORY');
                }} style={styles.inlineAction}>
                  <AppText variant="small" style={styles.actionText}>Add</AppText>
                </Pressable>
                <Pressable onPress={() => setCategoryPickerVisible(false)} style={styles.closeButton}>
                  <AppText variant="small">Close</AppText>
                </Pressable>
              </View>
            </View>
            <FormInput
              label="Search categories"
              value={categorySearch}
              onChangeText={setCategorySearch}
              placeholder="Search spending categories"
              autoFocus
            />
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.pickerScroll}>
              {showSearchResults ? (
                searchedCategories.length > 0 ? (
                  <CategorySection
                    title="Matching results"
                    items={searchedCategories}
                    selectedId={selectedCategoryId}
                    onSelect={(id) => {
                      setSelectedCategoryId(id);
                      setCategoryPickerVisible(false);
                    }}
                  />
                ) : (
                  <View style={styles.emptySearch}>
                    <AppText>No category found</AppText>
                    <AppText variant="small" muted>Search another name or add a new category.</AppText>
                    <PrimaryButton compact variant="ghost" onPress={() => {
                      setCategoryPickerVisible(false);
                      setName(categorySearch.trim());
                      setMode('CATEGORY');
                    }}>
                      Add "{categorySearch.trim()}"
                    </PrimaryButton>
                  </View>
                )
              ) : (
                <>
                  {recentCategories.length > 0 ? (
                    <CategorySection
                      title="Recent"
                      items={recentCategories}
                      selectedId={selectedCategoryId}
                      onSelect={(id) => {
                        setSelectedCategoryId(id);
                        setCategoryPickerVisible(false);
                      }}
                    />
                  ) : null}
                  {frequentCategories.length > 0 ? (
                    <CategorySection
                      title="Frequent"
                      items={frequentCategories}
                      selectedId={selectedCategoryId}
                      onSelect={(id) => {
                        setSelectedCategoryId(id);
                        setCategoryPickerVisible(false);
                      }}
                    />
                  ) : null}
                  <CategorySection
                    title="All categories"
                    items={otherCategories.length > 0 ? otherCategories : categories}
                    selectedId={selectedCategoryId}
                    onSelect={(id) => {
                      setSelectedCategoryId(id);
                      setCategoryPickerVisible(false);
                    }}
                  />
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

function StatusPill({ status }: { status: CreditCardEmi['status'] }) {
  const theme = useTheme();
  const tone = status === 'COMPLETED' ? colors.income : status === 'OVERDUE' ? colors.expense : '#f59e0b';
  return (
    <View style={[styles.metaPill, { backgroundColor: theme.scheme === 'dark' ? `${tone}22` : `${tone}18` }]}>
      <AppText variant="small" style={{ color: tone }}>{status === 'PARTIALLY_PAID' ? 'Part paid' : status === 'COMPLETED' ? 'Completed' : status === 'OVERDUE' ? 'Overdue' : 'Active'}</AppText>
    </View>
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
  const theme = useTheme();
  return (
    <View style={[styles.metaPill, { backgroundColor: theme.colors.surfaceMuted }]}>
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

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
}

function effectiveInstallmentAmount(emi: CreditCardEmi) {
  if (emi.totalInstallments <= 1) return emi.originalAmount;
  const normalized = Math.max(Math.round((emi.originalAmount / emi.totalInstallments) * 100) / 100, 0.01);
  if (emi.installmentAmount <= 0) return normalized;
  if (emi.installmentAmount >= emi.originalAmount) return normalized;
  return emi.installmentAmount;
}

function buildRecentCategoryIds(activities: CreditCardActivity[]) {
  return activities
    .filter((activity) => activity.type === 'SPEND' && activity.categoryId)
    .slice(0, 5)
    .map((activity) => activity.categoryId as number)
    .filter((id, index, ids) => ids.indexOf(id) === index);
}

function buildFrequentCategoryIds(activities: CreditCardActivity[]) {
  const counts = new Map<number, number>();
  activities
    .filter((activity) => activity.type === 'SPEND' && activity.categoryId)
    .slice(0, 60)
    .forEach((activity) => {
      const id = activity.categoryId as number;
      counts.set(id, (counts.get(id) ?? 0) + 1);
    });

  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([id]) => id);
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

function CategorySection({
  title,
  items,
  selectedId,
  onSelect,
}: {
  title: string;
  items: Category[];
  selectedId: number;
  onSelect: (id: number) => void;
}) {
  return (
    <View style={styles.sectionBlock}>
      <AppText variant="small" muted>{title}</AppText>
      <View style={styles.categoryList}>
        {items.map((item) => {
          const selected = selectedId === item.id;
          return (
            <Pressable key={item.id} onPress={() => onSelect(item.id)} style={[styles.categoryRow, selected && styles.categoryRowSelected]}>
              <View style={[styles.rowCategoryIcon, selected && styles.rowCategoryIconSelected]}>
                <Ionicons name="pricetag-outline" size={16} color={selected ? colors.background : colors.expense} />
              </View>
              <AppText style={selected ? styles.selectedCategoryText : undefined}>{item.name}</AppText>
            </Pressable>
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
    maxHeight: '88%',
  },
  modalScrollContent: {
    gap: spacing.lg,
    paddingBottom: spacing.sm,
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
  emiHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  actionText: {
    color: colors.primary,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
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
  selectorField: {
    minHeight: 58,
    borderRadius: radius.md,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    justifyContent: 'center',
  },
  selectorContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  selectorIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectorCopy: {
    flex: 1,
    gap: 2,
  },
  pickerPanel: {
    maxHeight: '82%',
  },
  closeButton: {
    padding: spacing.sm,
  },
  inlineAction: {
    padding: spacing.sm,
  },
  pickerScroll: {
    gap: spacing.md,
    paddingBottom: spacing.xs,
  },
  sectionBlock: {
    gap: spacing.sm,
  },
  categoryList: {
    gap: spacing.xs,
  },
  categoryRow: {
    minHeight: 46,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  categoryRowSelected: {
    backgroundColor: colors.primary,
  },
  rowCategoryIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,122,122,0.10)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowCategoryIconSelected: {
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  selectedCategoryText: {
    color: colors.background,
  },
  emptySearch: {
    gap: spacing.sm,
    alignItems: 'flex-start',
  },
  addEmiButton: {
    minHeight: 36,
    paddingHorizontal: spacing.md,
    borderRadius: radius.sm,
  },
  modalActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  modalButton: {
    flex: 1,
  },
  filterChip: {
    minHeight: 34,
    borderRadius: radius.sm,
  },
  emiCard: {
    marginTop: spacing.sm,
    padding: spacing.sm,
    gap: spacing.sm,
    borderRadius: radius.sm,
    borderWidth: 1,
  },
  emiDetailHero: {
    gap: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    padding: spacing.md,
  },
  emiFill: {
    height: 8,
    borderRadius: 8,
    backgroundColor: colors.income,
  },
  paymentHistoryScroll: {
    maxHeight: 260,
  },
  paymentHistoryContent: {
    gap: spacing.sm,
  },
  paymentRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.sm,
    paddingBottom: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  iconActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  smallIconButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
