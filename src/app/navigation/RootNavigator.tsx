import { NavigationContainer, DarkTheme, DefaultTheme } from '@react-navigation/native';
import { useEffect, useState } from 'react';
import { useAuth } from '../providers/AuthContext';
import { AuthNavigator } from './AuthNavigator';
import { AppTabNavigator } from './AppTabNavigator';
import { StartupSplash } from '../../shared/components/StartupSplash';
import { useTheme } from '../../shared/theme/ThemeContext';

export function RootNavigator() {
  const { user, initializing } = useAuth();
  const { colors, scheme } = useTheme();
  const [minimumSplashVisible, setMinimumSplashVisible] = useState(true);

  const navigationTheme = {
    ...(scheme === 'dark' ? DarkTheme : DefaultTheme),
    colors: {
      ...(scheme === 'dark' ? DarkTheme.colors : DefaultTheme.colors),
      background: colors.background,
      card: colors.surface,
      primary: colors.primary,
      text: colors.text,
      border: colors.border,
    },
  };

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
