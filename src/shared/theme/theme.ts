import { Appearance, Platform } from 'react-native';

export const darkColors = {
  background: '#0B0F14',
  backgroundElevated: '#11161D',
  surface: '#131A22',
  surfaceMuted: '#1A222C',
  card: '#121922',
  cardSoft: '#18212B',
  cardGlass: 'rgba(255,255,255,0.06)',
  text: '#F5F7FA',
  textMuted: '#98A4B3',
  border: 'rgba(255,255,255,0.08)',
  borderStrong: 'rgba(255,255,255,0.14)',
  primary: '#22C55E',
  primaryDark: '#16A34A',
  accent: '#60A5FA',
  warning: '#F87171',
  danger: '#EF4444',
  income: '#22C55E',
  expense: '#F87171',
  transfer: '#60A5FA',
  cash: '#F59E0B',
  bank: '#38BDF8',
  wallet: '#A78BFA',
};

export const lightColors: typeof darkColors = {
  background: '#F4F6F8',
  backgroundElevated: '#FFFFFF',
  surface: '#FFFFFF',
  surfaceMuted: '#EEF2F6',
  card: '#FFFFFF',
  cardSoft: '#F7F9FB',
  cardGlass: 'rgba(7,17,19,0.05)',
  text: '#0F172A',
  textMuted: '#667085',
  border: 'rgba(15,23,42,0.10)',
  borderStrong: 'rgba(15,23,42,0.16)',
  primary: '#16A34A',
  primaryDark: '#15803D',
  accent: '#2563EB',
  warning: '#DC2626',
  danger: '#DC2626',
  income: '#16A34A',
  expense: '#DC2626',
  transfer: '#2563EB',
  cash: '#D97706',
  bank: '#0284C7',
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
  xl: 20,
  xxl: 32,
};

export const radius = {
  sm: 8,
  md: 12,
  lg: 14,
  xl: 18,
};

const fontFamily = Platform.select({
  ios: 'SF Pro Text',
  android: 'sans-serif',
  default: 'sans-serif',
});

const fontFamilyDisplay = Platform.select({
  ios: 'SF Pro Display',
  android: 'sans-serif-medium',
  default: 'sans-serif',
});

export const typography = {
  title: 30,
  h1: 24,
  h2: 18,
  body: 15,
  small: 12,
  fontFamily,
  fontFamilyDisplay,
};
