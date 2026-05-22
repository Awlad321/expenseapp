import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { ReportsStackParamList } from '../routes/types';
import { ReportsScreen } from '../../features/reports/screens/ReportsScreen';

const Stack = createNativeStackNavigator<ReportsStackParamList>();

export function ReportsNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ReportsHome" component={ReportsScreen} />
    </Stack.Navigator>
  );
}
