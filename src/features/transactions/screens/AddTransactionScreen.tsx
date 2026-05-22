import { useEffect, useState } from 'react';
import { Alert, Modal, Pressable, StyleSheet, View } from 'react-native';
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
import { colors, radius, spacing } from '../../../shared/theme/theme';
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
  const type = ((route.params as { type?: TransactionType } | undefined)?.type ?? (route.name === 'AddIncome' ? 'INCOME' : 'EXPENSE')) as TransactionType;
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [categoryModalVisible, setCategoryModalVisible] = useState(false);
  const [categoryName, setCategoryName] = useState('');
  const [categorySaving, setCategorySaving] = useState(false);
  const [recentAmounts, setRecentAmounts] = useState<string[]>([]);
  const [recentCategoryIds, setRecentCategoryIds] = useState<number[]>([]);
  const { control, handleSubmit, watch, setValue, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { accountId: 0, categoryId: 0, amount: '', transactionDate: today(), note: '' },
  });

  async function loadOptions() {
    try {
      const [accountData, categoryData, preference] = await Promise.all([
        accountService.list(),
        categoryService.list(type),
        getTransactionPreference(type),
      ]);
      const activeAccounts = accountData.filter((account) => account.active);
      setAccounts(activeAccounts);
      setRecentAmounts(preference.amounts);
      setRecentCategoryIds(preference.categoryIds);
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
      if (type === 'INCOME') {
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
      setCategoryModalVisible(false);
    } catch {
      Alert.alert('Could not add category', 'Please try a different category name.');
    } finally {
      setCategorySaving(false);
    }
  }

  return (
    <Screen refreshing={refreshing} onRefresh={refresh}>
      <Header title={type === 'INCOME' ? 'Add income' : 'Add expense'} subtitle="Transfers stay separate from reports" />
      <ChoiceRow title="Account" items={accounts.map((account) => ({ id: account.id, label: account.name }))} selectedId={watch('accountId')} onSelect={(id) => setValue('accountId', id)} />
      {errors.accountId ? <AppText variant="small" style={styles.error}>{errors.accountId.message}</AppText> : null}
      <ChoiceRow
        title="Category"
        actionLabel="Add category"
        onAction={() => setCategoryModalVisible(true)}
        items={categories.map((category) => ({ id: category.id, label: category.name }))}
        selectedId={watch('categoryId')}
        onSelect={(id) => setValue('categoryId', id, { shouldValidate: true })}
      />
      {errors.categoryId ? <AppText variant="small" style={styles.error}>{errors.categoryId.message}</AppText> : null}
      <Controller control={control} name="amount" render={({ field }) => (
        <FormInput label="Amount" keyboardType="numeric" value={field.value} onChangeText={field.onChange} error={errors.amount?.message} />
      )} />
      {recentAmounts.length > 0 ? (
        <ChoiceRow
          title="Recent amounts"
          items={recentAmounts.map((amount) => ({ id: Number(amount), label: `৳${amount}` }))}
          selectedId={Number(watch('amount'))}
          onSelect={(id) => setValue('amount', `${id}`, { shouldValidate: true })}
        />
      ) : null}
      <Controller control={control} name="transactionDate" render={({ field }) => (
        <DatePickerField label="Date" value={field.value} onChange={field.onChange} error={errors.transactionDate?.message} />
      )} />
      <Controller control={control} name="note" render={({ field }) => (
        <FormInput label="Note" value={field.value} onChangeText={field.onChange} />
      )} />
      <PrimaryButton loading={loading} onPress={handleSubmit(onSubmit)}>Save</PrimaryButton>
      <Modal visible={categoryModalVisible} transparent animationType="fade" onRequestClose={() => setCategoryModalVisible(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalPanel}>
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
    </Screen>
  );
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
            <PrimaryButton key={item.id} variant={selected ? 'primary' : 'ghost'} onPress={() => onSelect(item.id)} style={styles.chip}>
              <AppText variant="small" style={{ color: selected ? colors.background : colors.text }}>{item.label}</AppText>
            </PrimaryButton>
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
  modalHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  closeButton: {
    padding: spacing.sm,
  },
  modalActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  modalButton: {
    flex: 1,
  },
});
