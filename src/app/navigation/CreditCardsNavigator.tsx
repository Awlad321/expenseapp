import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { CreditCardsStackParamList } from '../routes/types';
import { CreditCardsScreen } from '../../features/accounts/screens/CreditCardsScreen';

const Stack = createNativeStackNavigator<CreditCardsStackParamList>();

export function CreditCardsNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="CreditCardsHome" component={CreditCardsScreen} />
    </Stack.Navigator>
  );
}
