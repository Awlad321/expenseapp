import { useEffect, useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import type { TransactionsStackParamList } from '../../../app/routes/types';
import { AppText } from '../../../shared/components/AppText';
import { DatePickerField } from '../../../shared/components/DatePickerField';
import { FormInput } from '../../../shared/components/FormInput';
import { Header } from '../../../shared/components/Header';
import { PrimaryButton } from '../../../shared/components/PrimaryButton';
import { Screen } from '../../../shared/components/Screen';
import { Card } from '../../../shared/components/Card';
import { colors, radius, spacing } from '../../../shared/theme/theme';
import { useTheme } from '../../../shared/theme/ThemeContext';
import { today } from '../../../shared/utils/format';
import type { Account, Category, TransactionType } from '../../../shared/types/api';
import { accountService } from '../../accounts/services/accountService';
import { categoryService } from '../../categories/services/categoryService';
import { getTransactionPreference, saveTransactionPreference } from '../services/transactionPreferences';
import { transactionService } from '../services/transactionService';

const schema = z.object({
  accountId: z.number().positive('Choose an account'),
  categoryId: z.number().positive('Choose a category'),
  amount: z.string().min(1, 'Amount is required'),
  transactionDate: z.string().min(1, 'Date is required'),
  note: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;
type Props = NativeStackScreenProps<TransactionsStackParamList, 'AddIncome' | 'AddExpense'>;

export function AddTransactionScreen({ route, navigation }: Props) {
  const theme = useTheme();
  const type = (route.name === 'AddIncome' ? 'INCOME' : 'EXPENSE') as TransactionType;
  const transactionId = route.params?.transactionId;
  const duplicateTransactionId = route.params?.duplicateTransactionId;
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [categoryPickerVisible, setCategoryPickerVisible] = useState(false);
  const [categoryModalVisible, setCategoryModalVisible] = useState(false);
  const [categorySearch, setCategorySearch] = useState('');
  const [categoryName, setCategoryName] = useState('');
  const [categorySaving, setCategorySaving] = useState(false);
  const [loadingTransaction, setLoadingTransaction] = useState(Boolean(transactionId || duplicateTransactionId));
  const [recentAmounts, setRecentAmounts] = useState<string[]>([]);
  const [recentCategoryIds, setRecentCategoryIds] = useState<number[]>([]);
  const [frequentCategoryIds, setFrequentCategoryIds] = useState<number[]>([]);
  const { control, handleSubmit, watch, setValue, reset, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { accountId: 0, categoryId: 0, amount: '', transactionDate: today(), note: '' },
  });

  async function loadOptions() {
    try {
      const [accountData, categoryData, preference, recentTransactions] = await Promise.all([
        accountService.list(),
        categoryService.list(type),
        getTransactionPreference(type),
        transactionService.list({ type }),
      ]);
      const activeAccounts = accountData.filter((account) => account.active);
      setAccounts(activeAccounts);
      setRecentAmounts(preference.amounts);
      setRecentCategoryIds(preference.categoryIds);
      setFrequentCategoryIds(buildFrequentCategoryIds(recentTransactions));
      setCategories(sortCategoriesByRecent(categoryData, preference.categoryIds));

      if (preference.accountId && activeAccounts.some((account) => account.id === preference.accountId)) {
        setValue('accountId', preference.accountId, { shouldValidate: true });
      }
      if (preference.categoryIds[0] && categoryData.some((category) => category.id === preference.categoryIds[0])) {
        setValue('categoryId', preference.categoryIds[0], { shouldValidate: true });
      }
    } finally {
      setRefreshing(false);
    }
  }

  useEffect(() => {
    loadOptions();
  }, [type]);

  useEffect(() => {
    const sourceTransactionId = transactionId ?? duplicateTransactionId;
    if (!sourceTransactionId) {
      setLoadingTransaction(false);
      return;
    }

    transactionService.get(sourceTransactionId)
      .then((transaction) => {
        reset({
          accountId: transaction.accountId,
          categoryId: transaction.categoryId,
          amount: `${transaction.amount}`,
          transactionDate: duplicateTransactionId ? today() : transaction.transactionDate,
          note: transaction.note ?? '',
        });
      })
      .catch(() => {
        Alert.alert('Could not load transaction', 'The selected transaction could not be loaded.');
        navigation.goBack();
      })
      .finally(() => setLoadingTransaction(false));
  }, [duplicateTransactionId, navigation, reset, transactionId]);

  async function refresh() {
    setRefreshing(true);
    await loadOptions();
  }

  async function onSubmit(values: FormValues) {
    setLoading(true);
    try {
      const payload = {
        accountId: values.accountId,
        categoryId: values.categoryId,
        amount: Number(values.amount),
        transactionDate: values.transactionDate,
        note: values.note,
      };
      if (transactionId) {
        await transactionService.update(transactionId, payload);
      } else if (type === 'INCOME') {
        await transactionService.createIncome(payload);
      } else {
        await transactionService.createExpense(payload);
      }
      await saveTransactionPreference(type, {
        accountId: values.accountId,
        categoryId: values.categoryId,
        amount: values.amount,
      });
      navigation.goBack();
    } catch {
      Alert.alert('Could not save transaction', 'Please check your account, category, and amount.');
    } finally {
      setLoading(false);
    }
  }

  async function createCategory() {
    const name = categoryName.trim();
    if (!name) {
      Alert.alert('Category name required', 'Enter a name for the new category.');
      return;
    }

    setCategorySaving(true);
    try {
      const category = await categoryService.create({ name, type });
      setCategories((current) => sortCategoriesByRecent([...current, category], [category.id, ...recentCategoryIds]));
      setRecentCategoryIds((current) => [category.id, ...current.filter((id) => id !== category.id)].slice(0, 5));
      setValue('categoryId', category.id, { shouldValidate: true });
      setCategoryName('');
      setCategorySearch('');
      setCategoryModalVisible(false);
    } catch {
      Alert.alert('Could not add category', 'Please try a different category name.');
    } finally {
      setCategorySaving(false);
    }
  }

  const recentCategories = categories.filter((category) => recentCategoryIds.includes(category.id)).sort((a, b) => recentCategoryIds.indexOf(a.id) - recentCategoryIds.indexOf(b.id));
  const frequentCategories = categories
    .filter((category) => !recentCategoryIds.includes(category.id) && frequentCategoryIds.includes(category.id))
    .sort((a, b) => frequentCategoryIds.indexOf(a.id) - frequentCategoryIds.indexOf(b.id));
  const otherCategories = categories.filter((category) => !recentCategoryIds.includes(category.id) && !frequentCategoryIds.includes(category.id));
  const selectedCategory = categories.find((category) => category.id === watch('categoryId'));
  const trimmedCategorySearch = categorySearch.trim().toLowerCase();
  const searchedCategories = categories.filter((category) => category.name.toLowerCase().includes(trimmedCategorySearch));
  const showSearchResults = trimmedCategorySearch.length > 0;

  return (
    <Screen refreshing={refreshing} onRefresh={refresh}>
      <Header title={type === 'INCOME' ? (transactionId ? 'Edit income' : duplicateTransactionId ? 'Duplicate income' : 'Add income') : (transactionId ? 'Edit expense' : duplicateTransactionId ? 'Duplicate expense' : 'Add expense')} subtitle="Transfers stay separate from reports" />
      <ChoiceRow title="Account" items={accounts.map((account) => ({ id: account.id, label: account.name }))} selectedId={watch('accountId')} onSelect={(id) => setValue('accountId', id)} />
      {errors.accountId ? <AppText variant="small" style={styles.error}>{errors.accountId.message}</AppText> : null}
      <View style={styles.choiceBlock}>
        <View style={styles.choiceHeader}>
          <AppText variant="small" muted>Category</AppText>
          <Pressable
            onPress={() => {
              setCategoryPickerVisible(true);
              setCategorySearch('');
            }}
            hitSlop={8}
          >
            <AppText variant="small" style={styles.actionText}>{selectedCategory ? 'Change' : 'Choose'}</AppText>
          </Pressable>
        </View>
        <Pressable
          onPress={() => {
            setCategoryPickerVisible(true);
            setCategorySearch('');
          }}
          style={[styles.selectorField, { backgroundColor: theme.colors.surface, borderColor: errors.categoryId ? theme.colors.danger : theme.colors.border }]}
        >
          <View style={styles.selectorContent}>
            <View style={[styles.selectorIcon, { backgroundColor: theme.colors.surfaceMuted }]}>
              <Ionicons name={type === 'INCOME' ? 'add-circle-outline' : 'pricetag-outline'} size={18} color={type === 'INCOME' ? theme.colors.income : theme.colors.expense} />
            </View>
            <View style={styles.selectorCopy}>
              <AppText>{selectedCategory?.name ?? `Select ${type === 'INCOME' ? 'income' : 'expense'} category`}</AppText>
              <AppText variant="small" muted>{selectedCategory ? 'Search to change category' : 'Recent and frequent categories appear first'}</AppText>
            </View>
            <Ionicons name="chevron-down" size={18} color={theme.colors.textMuted} />
          </View>
        </Pressable>
      </View>
      {errors.categoryId ? <AppText variant="small" style={styles.error}>{errors.categoryId.message}</AppText> : null}
      <Card>
        <View style={styles.entryHeader}>
          <View>
            <AppText variant="h2">Amount</AppText>
            <AppText variant="small" muted>Fast entry with recent values</AppText>
          </View>
          {watch('accountId') ? (
            <View style={[styles.selectedHint, { backgroundColor: theme.colors.surfaceMuted }]}>
              <AppText variant="small" muted>{accounts.find((account) => account.id === watch('accountId'))?.name}</AppText>
            </View>
          ) : null}
        </View>
        <Controller control={control} name="amount" render={({ field }) => (
          <FormInput label="Amount" keyboardType="numeric" placeholder="0" value={field.value} onChangeText={field.onChange} error={errors.amount?.message} />
        )} />
        {recentAmounts.length > 0 ? (
          <ChoiceRow
            title="Recent amounts"
            items={recentAmounts.map((amount) => ({ id: Number(amount), label: `৳${amount}` }))}
            selectedId={Number(watch('amount'))}
            onSelect={(id) => setValue('amount', `${id}`, { shouldValidate: true })}
          />
        ) : null}
      </Card>
      <Controller control={control} name="transactionDate" render={({ field }) => (
        <DatePickerField label="Date" value={field.value} onChange={field.onChange} error={errors.transactionDate?.message} />
      )} />
      <Controller control={control} name="note" render={({ field }) => (
        <FormInput label="Note" value={field.value} onChangeText={field.onChange} />
      )} />
      <PrimaryButton loading={loading || loadingTransaction} disabled={loadingTransaction} onPress={handleSubmit(onSubmit)}>
        {transactionId ? 'Update' : duplicateTransactionId ? 'Create Copy' : 'Save'}
      </PrimaryButton>
      <Modal visible={categoryModalVisible} transparent animationType="fade" onRequestClose={() => setCategoryModalVisible(false)}>
        <View style={[styles.modalBackdrop, { backgroundColor: theme.scheme === 'dark' ? 'rgba(0,0,0,0.52)' : 'rgba(7,17,19,0.28)' }]}>
          <View style={[styles.modalPanel, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
            <View style={styles.modalHeader}>
              <AppText variant="h2">New {type === 'INCOME' ? 'income' : 'expense'} category</AppText>
              <Pressable onPress={() => setCategoryModalVisible(false)} style={styles.closeButton}>
                <AppText variant="small">Close</AppText>
              </Pressable>
            </View>
            <FormInput label="Category name" value={categoryName} onChangeText={setCategoryName} autoFocus />
            <View style={styles.modalActions}>
              <PrimaryButton variant="ghost" onPress={() => setCategoryModalVisible(false)} style={styles.modalButton}>Cancel</PrimaryButton>
              <PrimaryButton loading={categorySaving} onPress={createCategory} style={styles.modalButton}>Add</PrimaryButton>
            </View>
          </View>
        </View>
      </Modal>
      <Modal visible={categoryPickerVisible} transparent animationType="fade" onRequestClose={() => setCategoryPickerVisible(false)}>
        <View style={[styles.modalBackdrop, { backgroundColor: theme.scheme === 'dark' ? 'rgba(0,0,0,0.52)' : 'rgba(7,17,19,0.28)' }]}>
          <View style={[styles.modalPanel, styles.pickerPanel, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
            <View style={styles.modalHeader}>
              <AppText variant="h2">Select category</AppText>
              <View style={styles.headerActions}>
                <Pressable
                  onPress={() => {
                    setCategoryPickerVisible(false);
                    setCategoryModalVisible(true);
                  }}
                  style={styles.inlineAction}
                >
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
              placeholder={`Search ${type === 'INCOME' ? 'income' : 'expense'} categories`}
              autoFocus
            />
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.pickerScroll}>
              {showSearchResults ? (
                searchedCategories.length > 0 ? (
                  <CategorySection
                    title="Matching results"
                    items={searchedCategories}
                    selectedId={watch('categoryId')}
                    onSelect={(id) => {
                      setValue('categoryId', id, { shouldValidate: true });
                      setCategoryPickerVisible(false);
                    }}
                    type={type}
                  />
                ) : (
                  <View style={styles.emptySearch}>
                    <AppText>No category found</AppText>
                    <AppText variant="small" muted>Search another name or add a new category.</AppText>
                    <PrimaryButton compact variant="ghost" onPress={() => {
                      setCategoryPickerVisible(false);
                      setCategoryName(categorySearch);
                      setCategoryModalVisible(true);
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
                      selectedId={watch('categoryId')}
                      onSelect={(id) => {
                        setValue('categoryId', id, { shouldValidate: true });
                        setCategoryPickerVisible(false);
                      }}
                      type={type}
                    />
                  ) : null}
                  {frequentCategories.length > 0 ? (
                    <CategorySection
                      title="Frequent"
                      items={frequentCategories}
                      selectedId={watch('categoryId')}
                      onSelect={(id) => {
                        setValue('categoryId', id, { shouldValidate: true });
                        setCategoryPickerVisible(false);
                      }}
                      type={type}
                    />
                  ) : null}
                  <CategorySection
                    title="All categories"
                    items={otherCategories.length > 0 ? otherCategories : categories}
                    selectedId={watch('categoryId')}
                    onSelect={(id) => {
                      setValue('categoryId', id, { shouldValidate: true });
                      setCategoryPickerVisible(false);
                    }}
                    type={type}
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

function buildFrequentCategoryIds(transactions: Array<{ categoryId: number }>) {
  const counts = new Map<number, number>();
  transactions.slice(0, 60).forEach((transaction) => {
    counts.set(transaction.categoryId, (counts.get(transaction.categoryId) ?? 0) + 1);
  });

  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([id]) => id);
}

function sortCategoriesByRecent(categories: Category[], recentCategoryIds: number[]) {
  return [...categories].sort((a, b) => {
    const aIndex = recentCategoryIds.indexOf(a.id);
    const bIndex = recentCategoryIds.indexOf(b.id);
    if (aIndex !== -1 || bIndex !== -1) {
      if (aIndex === -1) return 1;
      if (bIndex === -1) return -1;
      return aIndex - bIndex;
    }
    return a.name.localeCompare(b.name);
  });
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
  type,
}: {
  title: string;
  items: Category[];
  selectedId: number;
  onSelect: (id: number) => void;
  type: TransactionType;
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
                <Ionicons name={type === 'INCOME' ? 'add-outline' : 'pricetag-outline'} size={16} color={selected ? colors.background : type === 'INCOME' ? colors.income : colors.expense} />
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
  choiceBlock: {
    gap: spacing.sm,
  },
  choiceHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  actionText: {
    color: colors.primary,
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
  error: {
    color: colors.danger,
  },
  entryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  selectedHint: {
    borderRadius: 999,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
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
  modalBackdrop: {
    flex: 1,
    justifyContent: 'center',
    padding: spacing.lg,
    backgroundColor: 'rgba(0,0,0,0.72)',
  },
  modalPanel: {
    gap: spacing.lg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    padding: spacing.lg,
  },
  pickerPanel: {
    maxHeight: '82%',
  },
  modalHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  closeButton: {
    padding: spacing.sm,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
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
    backgroundColor: 'rgba(20,158,110,0.10)',
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
  modalActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  modalButton: {
    flex: 1,
  },
});
