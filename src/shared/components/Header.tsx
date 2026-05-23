import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from './AppText';
import { colors, spacing } from '../theme/theme';
import { useTheme } from '../theme/ThemeContext';

interface HeaderProps {
  title: string;
  subtitle?: string;
  rightIcon?: keyof typeof Ionicons.glyphMap;
  onRightPress?: () => void;
}

export function Header({ title, subtitle, rightIcon, onRightPress }: HeaderProps) {
  const theme = useTheme();
  return (
    <View style={styles.header}>
      <View style={styles.copy}>
        <AppText variant="h1">{title}</AppText>
        {subtitle ? <AppText muted>{subtitle}</AppText> : null}
      </View>
      {rightIcon ? (
        <Pressable onPress={onRightPress} style={[styles.iconButton, { backgroundColor: theme.colors.surfaceMuted }]}>
          <Ionicons name={rightIcon} size={22} color={theme.colors.text} />
        </Pressable>
      ) : null}
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
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
