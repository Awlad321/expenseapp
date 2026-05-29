import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { DebtsStackParamList } from '../routes/types';
import { DebtListScreen } from '../../features/debts/screens/DebtListScreen';
import { AddEditDebtScreen } from '../../features/debts/screens/AddEditDebtScreen';
import { DebtDetailsScreen } from '../../features/debts/screens/DebtDetailsScreen';

const Stack = createNativeStackNavigator<DebtsStackParamList>();

export function DebtsNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="DebtsHome" component={DebtListScreen} />
      <Stack.Screen name="AddEditDebt" component={AddEditDebtScreen} />
      <Stack.Screen name="DebtDetails" component={DebtDetailsScreen} />
    </Stack.Navigator>
  );
}
