import { useEffect, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import type { TransfersStackParamList } from '../../../app/routes/types';
import { AppText } from '../../../shared/components/AppText';
import { DatePickerField } from '../../../shared/components/DatePickerField';
import { FormInput } from '../../../shared/components/FormInput';
import { Header } from '../../../shared/components/Header';
import { PrimaryButton } from '../../../shared/components/PrimaryButton';
import { Screen } from '../../../shared/components/Screen';
import { colors, radius, spacing } from '../../../shared/theme/theme';
import { today } from '../../../shared/utils/format';
import type { Account } from '../../../shared/types/api';
import { accountService } from '../../accounts/services/accountService';
import { transferService } from '../services/transferService';
import { useResponsiveLayout } from '../../../shared/layout/responsive';

const schema = z.object({
  fromAccountId: z.number().positive('Choose source account'),
  toAccountId: z.number().positive('Choose destination account'),
  amount: z.string().min(1, 'Amount is required'),
  feeAmount: z.string(),
  transferDate: z.string().min(1, 'Date is required'),
  note: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;
type Props = NativeStackScreenProps<TransfersStackParamList, 'AddTransfer'>;

export function AddTransferScreen({ navigation, route }: Props) {
  const transferId = route.params?.transferId;
  const layout = useResponsiveLayout();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingTransfer, setLoadingTransfer] = useState(Boolean(transferId));
  const { control, handleSubmit, watch, setValue, reset, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { fromAccountId: 0, toAccountId: 0, amount: '', feeAmount: '0', transferDate: today(), note: '' },
  });

  async function loadAccounts() {
    try {
      const data = await accountService.list();
      setAccounts(data.filter((account) => account.active));
    } finally {
      setRefreshing(false);
    }
  }

  useEffect(() => {
    loadAccounts();
  }, []);

  useEffect(() => {
    if (!transferId) {
      setLoadingTransfer(false);
      return;
    }

    transferService.get(transferId)
      .then((transfer) => {
        reset({
          fromAccountId: transfer.fromAccountId,
          toAccountId: transfer.toAccountId,
          amount: `${transfer.amount}`,
          feeAmount: `${transfer.feeAmount}`,
          transferDate: transfer.transferDate,
          note: transfer.note ?? '',
        });
      })
      .catch(() => {
        Alert.alert('Could not load transfer', 'The selected transfer could not be loaded.');
        navigation.goBack();
      })
      .finally(() => setLoadingTransfer(false));
  }, [navigation, reset, transferId]);

  async function refresh() {
    setRefreshing(true);
    await loadAccounts();
  }

  async function onSubmit(values: FormValues) {
    if (values.fromAccountId === values.toAccountId) {
      Alert.alert('Invalid transfer', 'Source and destination must be different.');
      return;
    }
    setLoading(true);
    try {
      const payload = {
        fromAccountId: values.fromAccountId,
        toAccountId: values.toAccountId,
        amount: Number(values.amount),
        feeAmount: Number(values.feeAmount || 0),
        transferDate: values.transferDate,
        note: values.note,
      };
      if (transferId) {
        await transferService.update(transferId, payload);
      } else {
        await transferService.create(payload);
      }
      navigation.goBack();
    } catch {
      Alert.alert('Could not save transfer', 'Check balance, accounts, amount, and fee.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen refreshing={refreshing} onRefresh={refresh}>
      <Header title={transferId ? 'Edit transfer' : 'Transfer money'} subtitle="Does not count as income or expense" />
      <ChoiceRow title="From" accounts={accounts} selectedId={watch('fromAccountId')} onSelect={(id) => setValue('fromAccountId', id)} />
      {errors.fromAccountId ? <AppText variant="small" style={styles.error}>{errors.fromAccountId.message}</AppText> : null}
      <ChoiceRow title="To" accounts={accounts} selectedId={watch('toAccountId')} onSelect={(id) => setValue('toAccountId', id)} />
      {errors.toAccountId ? <AppText variant="small" style={styles.error}>{errors.toAccountId.message}</AppText> : null}
      <Controller control={control} name="amount" render={({ field }) => (
        <FormInput label="Amount" keyboardType="numeric" value={field.value} onChangeText={field.onChange} error={errors.amount?.message} />
      )} />
      <Controller control={control} name="feeAmount" render={({ field }) => (
        <FormInput label="Fee amount" keyboardType="numeric" value={field.value} onChangeText={field.onChange} error={errors.feeAmount?.message} />
      )} />
      <Controller control={control} name="transferDate" render={({ field }) => (
        <DatePickerField label="Date" value={field.value} onChange={field.onChange} error={errors.transferDate?.message} />
      )} />
      <Controller control={control} name="note" render={({ field }) => (
        <FormInput label="Note" value={field.value} onChangeText={field.onChange} />
      )} />
      <PrimaryButton loading={loading || loadingTransfer} disabled={loadingTransfer} onPress={handleSubmit(onSubmit)}>
        {transferId ? 'Update Transfer' : 'Save Transfer'}
      </PrimaryButton>
    </Screen>
  );
}

function ChoiceRow({ title, accounts, selectedId, onSelect }: { title: string; accounts: Account[]; selectedId: number; onSelect: (id: number) => void }) {
  const layout = useResponsiveLayout();
  return (
    <View style={styles.choiceBlock}>
      <AppText variant="small" muted>{title}</AppText>
      <View style={styles.chips}>
        {accounts.map((account) => {
          const selected = selectedId === account.id;
          return (
            <PrimaryButton compact key={account.id} variant={selected ? 'primary' : 'ghost'} onPress={() => onSelect(account.id)} style={[styles.chip, layout.compact && styles.compactChip]}>
              {account.name}
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
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  chip: {
    minHeight: 40,
    borderRadius: radius.sm,
  },
  compactChip: {
    minHeight: 36,
  },
  error: {
    color: colors.danger,
  },
});
