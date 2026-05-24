import { useEffect, useState } from 'react';
import { Alert } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import type { AccountsStackParamList } from '../../../app/routes/types';
import { FormInput } from '../../../shared/components/FormInput';
import { Header } from '../../../shared/components/Header';
import { PrimaryButton } from '../../../shared/components/PrimaryButton';
import { Screen } from '../../../shared/components/Screen';
import { SegmentedControl } from '../../../shared/components/SegmentedControl';
import type { AccountType } from '../../../shared/types/api';
import { accountService } from '../services/accountService';

const schema = z.object({
  name: z.string().min(2, 'Account name is required'),
  type: z.enum(['CASH', 'BANK', 'WALLET', 'OTHER']),
  openingBalance: z.string().min(1, 'Opening balance is required'),
});

type FormValues = z.infer<typeof schema>;
type Props = NativeStackScreenProps<AccountsStackParamList, 'AddEditAccount'>;
const typeOptions = [
  { label: 'Cash', value: 'CASH' },
  { label: 'Bank', value: 'BANK' },
  { label: 'Wallet', value: 'WALLET' },
  { label: 'Other', value: 'OTHER' },
];

export function AddEditAccountScreen({ navigation, route }: Props) {
  const accountId = route.params?.accountId;
  const [loading, setLoading] = useState(false);
  const [loadingAccount, setLoadingAccount] = useState(Boolean(accountId));
  const { control, handleSubmit, watch, setValue, reset, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', type: 'CASH', openingBalance: '0' },
  });

  useEffect(() => {
    if (!accountId) return;

    accountService.get(accountId)
      .then((account) => {
        reset({
          name: account.name,
          type: account.type,
          openingBalance: `${account.openingBalance}`,
        });
      })
      .catch(() => {
        Alert.alert('Could not load account', 'The selected account could not be loaded.');
        navigation.goBack();
      })
      .finally(() => setLoadingAccount(false));
  }, [accountId, navigation, reset]);

  async function onSubmit(values: FormValues) {
    setLoading(true);
    try {
      const payload = {
        name: values.name,
        type: values.type,
        openingBalance: Number(values.openingBalance),
      };
      if (accountId) {
        await accountService.update(accountId, payload);
      } else {
        await accountService.create(payload);
      }
      navigation.goBack();
    } catch {
      Alert.alert('Could not save account', 'Please check the values and try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen>
      <Header title={accountId ? 'Edit account' : 'Add account'} subtitle={accountId ? 'Update account details' : 'Create a money source'} />
      <SegmentedControl compact options={typeOptions} value={watch('type')} onChange={(type) => setValue('type', type as AccountType)} />
      <Controller control={control} name="name" render={({ field }) => (
        <FormInput label="Account name" placeholder="Cash, Bank, bKash" value={field.value} onChangeText={field.onChange} error={errors.name?.message} />
      )} />
      <Controller control={control} name="openingBalance" render={({ field }) => (
        <FormInput label="Opening balance" keyboardType="numeric" value={field.value} onChangeText={field.onChange} error={errors.openingBalance?.message} />
      )} />
      <PrimaryButton loading={loading || loadingAccount} disabled={loadingAccount} onPress={handleSubmit(onSubmit)}>
        {accountId ? 'Update Account' : 'Save Account'}
      </PrimaryButton>
    </Screen>
  );
}
