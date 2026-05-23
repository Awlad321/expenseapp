import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from './AppText';
import { colors, spacing } from '../theme/theme';
import { useTheme } from '../theme/ThemeContext';

export function EmptyState({ icon, title, message }: { icon: keyof typeof Ionicons.glyphMap; title: string; message: string }) {
  const theme = useTheme();
  return (
    <View style={styles.empty}>
      <Ionicons name={icon} size={36} color={theme.colors.primary} />
      <AppText variant="h2">{title}</AppText>
      <AppText muted style={styles.message}>{message}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xxl,
  },
  message: {
    textAlign: 'center',
  },
});
