import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { TransactionsStackParamList } from '../routes/types';
import { TransactionListScreen } from '../../features/transactions/screens/TransactionListScreen';
import { AddTransactionScreen } from '../../features/transactions/screens/AddTransactionScreen';
import { ManageCategoriesScreen } from '../../features/transactions/screens/ManageCategoriesScreen';

const Stack = createNativeStackNavigator<TransactionsStackParamList>();

export function TransactionsNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="TransactionList" component={TransactionListScreen} />
      <Stack.Screen name="AddIncome" component={AddTransactionScreen} initialParams={{ type: 'INCOME' } as never} />
      <Stack.Screen name="AddExpense" component={AddTransactionScreen} initialParams={{ type: 'EXPENSE' } as never} />
      <Stack.Screen name="ManageCategories" component={ManageCategoriesScreen} />
    </Stack.Navigator>
  );
}
