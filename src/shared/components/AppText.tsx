import { ReactNode } from 'react';
import { StyleProp, StyleSheet, Text, TextStyle } from 'react-native';
import { colors, typography } from '../theme/theme';
import { useTheme } from '../theme/ThemeContext';

interface AppTextProps {
  children: ReactNode;
  variant?: 'title' | 'h1' | 'h2' | 'body' | 'small';
  muted?: boolean;
  style?: StyleProp<TextStyle>;
}

export function AppText({ children, variant = 'body', muted, style }: AppTextProps) {
  const theme = useTheme();
  return <Text style={[styles.base, { color: muted ? theme.colors.textMuted : theme.colors.text }, styles[variant], style]}>{children}</Text>;
}

const styles = StyleSheet.create({
  base: {
    color: colors.text,
    letterSpacing: 0,
  },
  title: {
    fontSize: typography.title,
    fontWeight: '800',
  },
  h1: {
    fontSize: typography.h1,
    fontWeight: '800',
  },
  h2: {
    fontSize: typography.h2,
    fontWeight: '700',
  },
  body: {
    fontSize: typography.body,
    fontWeight: '500',
  },
  small: {
    fontSize: typography.small,
    fontWeight: '600',
  },
  muted: {
    color: colors.textMuted,
  },
});
