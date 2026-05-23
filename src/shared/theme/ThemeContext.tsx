import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from 'react';
import * as SecureStore from 'expo-secure-store';
import { Appearance } from 'react-native';
import { AppColors, darkColors, lightColors, resolveThemePreference, ThemePreference } from './theme';

const THEME_KEY = 'expensapp.theme';

interface ThemeContextValue {
  preference: ThemePreference;
  scheme: 'light' | 'dark';
  colors: AppColors;
  setPreference: (preference: ThemePreference) => Promise<void>;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [preference, setPreferenceState] = useState<ThemePreference>('system');
  const [systemScheme, setSystemScheme] = useState<'light' | 'dark'>(() => resolveThemePreference('system'));

  useEffect(() => {
    SecureStore.getItemAsync(THEME_KEY).then((stored) => {
      if (stored === 'light' || stored === 'dark' || stored === 'system') {
        setPreferenceState(stored);
      }
    }).catch(() => undefined);

    const subscription = Appearance.addChangeListener(({ colorScheme }) => {
      setSystemScheme(colorScheme === 'light' ? 'light' : 'dark');
    });
    return () => subscription.remove();
  }, []);

  const scheme = preference === 'system' ? systemScheme : preference;

  const value = useMemo<ThemeContextValue>(() => ({
    preference,
    scheme,
    colors: scheme === 'dark' ? darkColors : lightColors,
    setPreference: async (nextPreference) => {
      await SecureStore.setItemAsync(THEME_KEY, nextPreference);
      setPreferenceState(nextPreference);
    },
  }), [preference, scheme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const value = useContext(ThemeContext);
  if (!value) {
    throw new Error('useTheme must be used inside ThemeProvider');
  }
  return value;
}
