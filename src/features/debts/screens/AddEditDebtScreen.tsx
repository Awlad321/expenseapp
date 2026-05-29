import { useEffect, useState } from 'react';
import { Alert } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { DebtsStackParamList } from '../../../app/routes/types';
import { AppText } from '../../../shared/components/AppText';
import { DatePickerField } from '../../../shared/components/DatePickerField';
import { FormInput } from '../../../shared/components/FormInput';
import { Header } from '../../../shared/components/Header';
import { PrimaryButton } from '../../../shared/components/PrimaryButton';
import { Screen } from '../../../shared/components/Screen';
import { today } from '../../../shared/utils/format';
import { debtService } from '../services/debtService';

type Props = NativeStackScreenProps<DebtsStackParamList, 'AddEditDebt'>;

export function AddEditDebtScreen({ navigation, route }: Props) {
  const debtId = route.params?.debtId;
  const [loading, setLoading] = useState(Boolean(debtId));
  const [saving, setSaving] = useState(false);
  const [personName, setPersonName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [description, setDescription] = useState('');
  const [totalAmount, setTotalAmount] = useState('');
  const [borrowDate, setBorrowDate] = useState(today());
  const [dueDate, setDueDate] = useState('');
  const [interestNote, setInterestNote] = useState('');
  const [tag, setTag] = useState('');

  useEffect(() => {
    if (!debtId) {
      setLoading(false);
      return;
    }
    debtService.get(debtId)
      .then((debt) => {
        setPersonName(debt.personName);
        setPhoneNumber(debt.phoneNumber ?? '');
        setDescription(debt.description ?? '');
        setTotalAmount(`${debt.totalAmount}`);
        setBorrowDate(debt.borrowDate);
        setDueDate(debt.dueDate ?? '');
        setInterestNote(debt.interestNote ?? '');
        setTag(debt.tag ?? '');
      })
      .catch(() => {
        Alert.alert('Could not load debt', 'The selected debt could not be loaded.');
        navigation.goBack();
      })
      .finally(() => setLoading(false));
  }, [debtId, navigation]);

  async function save() {
    setSaving(true);
    try {
      const payload = {
        personName,
        phoneNumber,
        description,
        totalAmount: Number(totalAmount),
        borrowDate,
        dueDate,
        interestNote,
        tag,
      };
      if (debtId) {
        await debtService.update(debtId, payload);
      } else {
        await debtService.create(payload);
      }
      navigation.goBack();
    } catch {
      Alert.alert('Could not save debt', 'Check the person name, amount, and dates.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Screen>
      <Header title={debtId ? 'Edit debt' : 'Add debt'} subtitle="Personal liability, separate from expenses" rightIcon="arrow-back-outline" onRightPress={() => navigation.goBack()} />
      <FormInput label="Person name" value={personName} onChangeText={setPersonName} />
      <FormInput label="Phone number" value={phoneNumber} onChangeText={setPhoneNumber} keyboardType="phone-pad" />
      <FormInput label="Description" value={description} onChangeText={setDescription} />
      <FormInput label="Total borrowed amount" value={totalAmount} onChangeText={setTotalAmount} keyboardType="numeric" />
      <DatePickerField label="Borrow date" value={borrowDate} onChange={setBorrowDate} />
      <DatePickerField label="Due date (optional)" value={dueDate} onChange={setDueDate} />
      <FormInput label="Interest note" value={interestNote} onChangeText={setInterestNote} />
      <FormInput label="Tag / category" value={tag} onChangeText={setTag} />
      <AppText variant="small" muted>Remaining and status are calculated automatically from total borrowed and recorded payments.</AppText>
      <PrimaryButton loading={saving || loading} disabled={loading} onPress={save}>{debtId ? 'Update Debt' : 'Save Debt'}</PrimaryButton>
    </Screen>
  );
}
