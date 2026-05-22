import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { TransfersStackParamList } from '../routes/types';
import { TransferListScreen } from '../../features/transfers/screens/TransferListScreen';
import { AddTransferScreen } from '../../features/transfers/screens/AddTransferScreen';

const Stack = createNativeStackNavigator<TransfersStackParamList>();

export function TransfersNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="TransferList" component={TransferListScreen} />
      <Stack.Screen name="AddTransfer" component={AddTransferScreen} />
    </Stack.Navigator>
  );
}
