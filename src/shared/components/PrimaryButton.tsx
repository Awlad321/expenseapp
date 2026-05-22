import { ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, ViewStyle } from 'react-native';
import { colors, radius, spacing } from '../theme/theme';
import { AppText } from './AppText';

interface PrimaryButtonProps {
  children: ReactNode;
  onPress: () => void;
  loading?: boolean;
  variant?: 'primary' | 'ghost' | 'danger';
  style?: ViewStyle;
}

export function PrimaryButton({ children, onPress, loading, variant = 'primary', style }: PrimaryButtonProps) {
  return (
    <Pressable disabled={loading} onPress={onPress} style={({ pressed }) => [styles.button, styles[variant], pressed && styles.pressed, style]}>
      {loading ? <ActivityIndicator color={variant === 'primary' ? colors.background : colors.text} /> : <AppText style={styles.label}>{children}</AppText>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 52,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  primary: {
    backgroundColor: colors.primary,
  },
  ghost: {
    backgroundColor: colors.surfaceMuted,
  },
  danger: {
    backgroundColor: colors.danger,
  },
  pressed: {
    opacity: 0.82,
  },
  label: {
    color: colors.background,
    fontWeight: '800',
  },
});
