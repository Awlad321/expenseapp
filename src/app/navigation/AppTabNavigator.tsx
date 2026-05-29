import { Ionicons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { AppTabParamList } from '../routes/types';
import { DashboardNavigator } from './DashboardNavigator';
import { TransactionsNavigator } from './TransactionsNavigator';
import { TransfersNavigator } from './TransfersNavigator';
import { AccountsNavigator } from './AccountsNavigator';
import { ReportsNavigator } from './ReportsNavigator';
import { CreditCardsNavigator } from './CreditCardsNavigator';
import { DebtsNavigator } from './DebtsNavigator';
import { useTheme } from '../../shared/theme/ThemeContext';
import { useResponsiveLayout } from '../../shared/layout/responsive';

const Tab = createBottomTabNavigator<AppTabParamList>();

const icons = {
  Dashboard: 'grid-outline',
  Transactions: 'receipt-outline',
  Transfer: 'swap-horizontal-outline',
  Accounts: 'wallet-outline',
  Debts: 'people-outline',
  Cards: 'card-outline',
  Reports: 'stats-chart-outline',
} as const;

export function AppTabNavigator() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const layout = useResponsiveLayout();
  const bottomInset = insets.bottom;
  const labels: Record<keyof AppTabParamList, string> = {
    Dashboard: 'Home',
    Transactions: 'Activity',
    Transfer: 'Move',
    Accounts: 'Accounts',
    Debts: 'Debt',
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
          height: (layout.compact ? 56 : 62) + bottomInset,
          paddingBottom: bottomInset > 0 ? bottomInset : 8,
          paddingTop: layout.compact ? 4 : 6,
          borderTopWidth: StyleSheet.hairlineWidth,
        },
        tabBarItemStyle: {
          paddingVertical: 0,
        },
        tabBarLabelStyle: {
          fontSize: layout.compact ? 11 : 12,
          fontWeight: '600',
        },
        tabBarLabel: labels[route.name as keyof AppTabParamList],
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarIconStyle: {
          marginTop: 2,
        },
        tabBarIcon: ({ color, size }) => <Ionicons name={icons[route.name]} color={color} size={size} />,
      })}
    >
      <Tab.Screen name="Dashboard" component={DashboardNavigator} />
      <Tab.Screen name="Transactions" component={TransactionsNavigator} />
      <Tab.Screen name="Transfer" component={TransfersNavigator} />
      <Tab.Screen name="Accounts" component={AccountsNavigator} />
      <Tab.Screen name="Debts" component={DebtsNavigator} />
      <Tab.Screen name="Cards" component={CreditCardsNavigator} />
      <Tab.Screen name="Reports" component={ReportsNavigator} />
    </Tab.Navigator>
  );
}
