import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { useEffect, useState } from 'react';
import { useAuth } from '../providers/AuthContext';
import { AuthNavigator } from './AuthNavigator';
import { AppTabNavigator } from './AppTabNavigator';
import { colors } from '../../shared/theme/theme';
import { StartupSplash } from '../../shared/components/StartupSplash';

const navigationTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: colors.background,
    card: colors.surface,
    primary: colors.primary,
    text: colors.text,
    border: colors.border,
  },
};

export function RootNavigator() {
  const { user, initializing } = useAuth();
  const [minimumSplashVisible, setMinimumSplashVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setMinimumSplashVisible(false), 1400);
    return () => clearTimeout(timer);
  }, []);

  if (initializing || minimumSplashVisible) {
    return <StartupSplash />;
  }

  return (
    <NavigationContainer theme={navigationTheme}>
      {user ? <AppTabNavigator /> : <AuthNavigator />}
    </NavigationContainer>
  );
}
