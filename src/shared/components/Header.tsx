import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from './AppText';
import { colors, spacing } from '../theme/theme';
import { useTheme } from '../theme/ThemeContext';
import { useResponsiveLayout } from '../layout/responsive';

interface HeaderProps {
  title: string;
  subtitle?: string;
  rightIcon?: keyof typeof Ionicons.glyphMap;
  onRightPress?: () => void;
}

export function Header({ title, subtitle, rightIcon, onRightPress }: HeaderProps) {
  const theme = useTheme();
  const layout = useResponsiveLayout();

  async function toggleTheme() {
    await theme.setPreference(theme.scheme === 'dark' ? 'light' : 'dark');
  }

  return (
    <View style={styles.header}>
      <View style={styles.copy}>
        <AppText variant="h1">{title}</AppText>
        {subtitle ? <AppText variant="small" muted>{subtitle}</AppText> : null}
      </View>
      <View style={styles.actions}>
        <Pressable onPress={toggleTheme} style={[styles.iconButton, { width: layout.iconButtonSize, height: layout.iconButtonSize, borderRadius: layout.iconButtonSize / 2, backgroundColor: theme.colors.surfaceMuted }]}>
          <Ionicons name={theme.scheme === 'dark' ? 'sunny-outline' : 'moon-outline'} size={22} color={theme.colors.text} />
        </Pressable>
        {rightIcon ? (
          <Pressable onPress={onRightPress} style={[styles.iconButton, { width: layout.iconButtonSize, height: layout.iconButtonSize, borderRadius: layout.iconButtonSize / 2, backgroundColor: theme.colors.surfaceMuted }]}>
            <Ionicons name={rightIcon} size={22} color={theme.colors.text} />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  copy: {
    flex: 1,
    gap: spacing.xs,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'flex-start',
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
