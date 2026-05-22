import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { DashboardStackParamList } from '../routes/types';
import { DashboardScreen } from '../../features/dashboard/screens/DashboardScreen';

const Stack = createNativeStackNavigator<DashboardStackParamList>();

export function DashboardNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="DashboardHome" component={DashboardScreen} />
    </Stack.Navigator>
  );
}
