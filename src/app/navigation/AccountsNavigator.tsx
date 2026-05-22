import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { AccountsStackParamList } from '../routes/types';
import { AccountsScreen } from '../../features/accounts/screens/AccountsScreen';
import { AddEditAccountScreen } from '../../features/accounts/screens/AddEditAccountScreen';
import { AccountLedgerScreen } from '../../features/accounts/screens/AccountLedgerScreen';

const Stack = createNativeStackNavigator<AccountsStackParamList>();

export function AccountsNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="AccountsHome" component={AccountsScreen} />
      <Stack.Screen name="AddEditAccount" component={AddEditAccountScreen} />
      <Stack.Screen name="AccountLedger" component={AccountLedgerScreen} />
    </Stack.Navigator>
  );
}
