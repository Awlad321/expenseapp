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
        {
          backgroundColor: theme.colors.card,
          borderColor: theme.colors.border,
          padding: layout.compact ? spacing.md : spacing.lg,
          gap: layout.compact ? spacing.sm : spacing.md,
          shadowColor: theme.scheme === 'dark' ? '#000000' : '#0F172A',
          shadowOpacity: theme.scheme === 'dark' ? 0.12 : 0.035,
          shadowRadius: 8,
          shadowOffset: { width: 0, height: 2 },
          elevation: theme.scheme === 'dark' ? 0 : 0,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.lg,
  },
});
