import { Ionicons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { AppTabParamList } from '../routes/types';
import { DashboardNavigator } from './DashboardNavigator';
import { TransactionsNavigator } from './TransactionsNavigator';
import { TransfersNavigator } from './TransfersNavigator';
import { AccountsNavigator } from './AccountsNavigator';
import { ReportsNavigator } from './ReportsNavigator';
import { CreditCardsNavigator } from './CreditCardsNavigator';
import { useTheme } from '../../shared/theme/ThemeContext';
import { useResponsiveLayout } from '../../shared/layout/responsive';

const Tab = createBottomTabNavigator<AppTabParamList>();

const icons = {
  Dashboard: 'grid-outline',
  Transactions: 'receipt-outline',
  Transfer: 'swap-horizontal-outline',
  Accounts: 'wallet-outline',
  Cards: 'card-outline',
  Reports: 'stats-chart-outline',
} as const;

export function AppTabNavigator() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const layout = useResponsiveLayout();
  const bottomInset = Math.max(insets.bottom, 24);
  const labels: Record<keyof AppTabParamList, string> = {
    Dashboard: 'Home',
    Transactions: 'Transactions',
    Transfer: 'Move',
    Accounts: 'Accounts',
    Cards: 'Cards',
    Reports: 'Insights',
  };

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          height: (layout.compact ? 60 : 66) + bottomInset,
          paddingBottom: bottomInset,
          paddingTop: layout.compact ? 6 : 8,
        },
        tabBarItemStyle: {
          paddingVertical: layout.compact ? 2 : 4,
        },
        tabBarLabelStyle: {
          fontSize: layout.compact ? 11 : 12,
          fontWeight: '600',
        },
        tabBarLabel: labels[route.name as keyof AppTabParamList],
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarIcon: ({ color, size }) => <Ionicons name={icons[route.name]} color={color} size={size} />,
      })}
    >
      <Tab.Screen name="Dashboard" component={DashboardNavigator} />
      <Tab.Screen name="Transactions" component={TransactionsNavigator} />
      <Tab.Screen name="Transfer" component={TransfersNavigator} />
      <Tab.Screen name="Accounts" component={AccountsNavigator} />
      <Tab.Screen name="Cards" component={CreditCardsNavigator} />
      <Tab.Screen name="Reports" component={ReportsNavigator} />
    </Tab.Navigator>
  );
}
