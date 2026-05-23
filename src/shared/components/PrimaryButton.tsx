import { ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleProp, StyleSheet, ViewStyle } from 'react-native';
import { colors, radius, spacing } from '../theme/theme';
import { AppText } from './AppText';
import { useTheme } from '../theme/ThemeContext';

interface PrimaryButtonProps {
  children: ReactNode;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  compact?: boolean;
  variant?: 'primary' | 'ghost' | 'secondary' | 'danger';
  style?: StyleProp<ViewStyle>;
}

export function PrimaryButton({ children, onPress, loading, disabled, compact, variant = 'primary', style }: PrimaryButtonProps) {
  const theme = useTheme();
  const backgroundColor = variant === 'primary'
    ? theme.colors.primary
    : variant === 'secondary'
      ? theme.colors.accent
      : variant === 'danger'
        ? theme.colors.danger
        : theme.colors.surfaceMuted;
  const labelColor = variant === 'ghost' ? theme.colors.text : theme.colors.background;

  return (
    <Pressable
      android_ripple={{ color: withOpacity(labelColor, 0.14), borderless: false }}
      disabled={loading || disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.button, compact && styles.compactButton, { backgroundColor }, (loading || disabled) && styles.disabled, pressed && styles.pressed, style]}
    >
      {loading ? <ActivityIndicator color={labelColor} /> : <AppText variant={compact ? 'small' : 'body'} style={[styles.label, { color: labelColor }]}>{children}</AppText>}
    </Pressable>
  );
}

function withOpacity(hex: string, opacity: number) {
  const normalized = hex.replace('#', '');
  if (normalized.length !== 6) return hex;
  const alpha = Math.round(opacity * 255).toString(16).padStart(2, '0');
  return `#${normalized}${alpha}`;
}

const styles = StyleSheet.create({
  button: {
    minHeight: 52,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  compactButton: {
    minHeight: 38,
    paddingHorizontal: spacing.sm,
  },
  pressed: {
    opacity: 0.82,
  },
  disabled: {
    opacity: 0.52,
  },
  label: {
    color: colors.background,
    fontWeight: '800',
  },
});
