import { Appearance } from 'react-native';

export const darkColors = {
  background: '#071113',
  backgroundElevated: '#0B171A',
  surface: '#101B1E',
  surfaceMuted: '#172529',
  card: '#142124',
  cardSoft: '#1D3034',
  cardGlass: 'rgba(255,255,255,0.06)',
  text: '#F4FBF8',
  textMuted: '#9EB1AD',
  border: 'rgba(255,255,255,0.09)',
  borderStrong: 'rgba(255,255,255,0.16)',
  primary: '#37D399',
  primaryDark: '#149E6E',
  accent: '#7DD3FC',
  warning: '#F8C057',
  danger: '#FF6B6B',
  income: '#36D399',
  expense: '#FF7A7A',
  transfer: '#7DD3FC',
  cash: '#F8C057',
  bank: '#6EE7B7',
  wallet: '#A78BFA',
};

export const lightColors: typeof darkColors = {
  background: '#F6FAF8',
  backgroundElevated: '#FFFFFF',
  surface: '#FFFFFF',
  surfaceMuted: '#E9F1EE',
  card: '#FFFFFF',
  cardSoft: '#EFF7F3',
  cardGlass: 'rgba(7,17,19,0.05)',
  text: '#071113',
  textMuted: '#5F706C',
  border: 'rgba(7,17,19,0.10)',
  borderStrong: 'rgba(7,17,19,0.18)',
  primary: '#149E6E',
  primaryDark: '#0C7953',
  accent: '#0284C7',
  warning: '#B7791F',
  danger: '#DC2626',
  income: '#059669',
  expense: '#DC2626',
  transfer: '#0284C7',
  cash: '#B7791F',
  bank: '#047857',
  wallet: '#7C3AED',
};

export type AppColors = typeof darkColors;
export type ThemePreference = 'system' | 'light' | 'dark';

export function resolveThemePreference(preference: ThemePreference) {
  if (preference === 'system') {
    return Appearance.getColorScheme() === 'light' ? 'light' : 'dark';
  }
  return preference;
}

export const isDarkMode = resolveThemePreference('system') === 'dark';
export const colors = isDarkMode ? darkColors : lightColors;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
};

export const radius = {
  sm: 8,
  md: 14,
  lg: 18,
  xl: 26,
};

export const typography = {
  title: 32,
  h1: 26,
  h2: 20,
  body: 15,
  small: 12,
};
