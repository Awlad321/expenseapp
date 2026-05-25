import { ReactNode } from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { colors, radius, spacing } from '../theme/theme';
import { useTheme } from '../theme/ThemeContext';
import { useResponsiveLayout } from '../layout/responsive';

export function Card({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  const theme = useTheme();
  const layout = useResponsiveLayout();
  return (
    <View
      style={[
        styles.card,
        { backgroundColor: theme.colors.card, borderColor: theme.colors.border, padding: layout.compact ? spacing.md : spacing.lg, gap: layout.compact ? spacing.sm : spacing.md },
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.md,
  },
});
