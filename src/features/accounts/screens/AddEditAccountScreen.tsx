import { useState } from 'react';
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

export function AddEditAccountScreen({ navigation }: Props) {
  const [loading, setLoading] = useState(false);
  const { control, handleSubmit, watch, setValue, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', type: 'CASH', openingBalance: '0' },
  });

  async function onSubmit(values: FormValues) {
    setLoading(true);
    try {
      await accountService.create({
        name: values.name,
        type: values.type,
        openingBalance: Number(values.openingBalance),
      });
      navigation.goBack();
    } catch {
      Alert.alert('Could not save account', 'Please check the values and try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen>
      <Header title="Add account" subtitle="Create a money source" />
      <SegmentedControl compact options={typeOptions} value={watch('type')} onChange={(type) => setValue('type', type as AccountType)} />
      <Controller control={control} name="name" render={({ field }) => (
        <FormInput label="Account name" placeholder="Cash, Bank, bKash" value={field.value} onChangeText={field.onChange} error={errors.name?.message} />
      )} />
      <Controller control={control} name="openingBalance" render={({ field }) => (
        <FormInput label="Opening balance" keyboardType="numeric" value={field.value} onChangeText={field.onChange} error={errors.openingBalance?.message} />
      )} />
      <PrimaryButton loading={loading} onPress={handleSubmit(onSubmit)}>Save Account</PrimaryButton>
    </Screen>
  );
}
