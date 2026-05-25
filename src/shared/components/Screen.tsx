import { ReactNode } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View, ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing } from '../theme/theme';
import { useTheme } from '../theme/ThemeContext';
import { useResponsiveLayout } from '../layout/responsive';

interface ScreenProps {
  children: ReactNode;
  scroll?: boolean;
  style?: ViewStyle;
  refreshing?: boolean;
  onRefresh?: () => void;
}

export function Screen({ children, scroll = true, style, refreshing = false, onRefresh }: ScreenProps) {
  const theme = useTheme();
  const layout = useResponsiveLayout();
  const content = (
    <View
      style={[
        styles.content,
        {
          padding: layout.contentPadding,
          gap: layout.sectionGap,
          maxWidth: layout.maxContentWidth,
          alignSelf: 'center',
          width: '100%',
        },
        style,
      ]}
    >
      {children}
    </View>
  );
  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.colors.background }]}>
      {scroll ? (
        <ScrollView
          contentContainerStyle={styles.scroll}
          refreshControl={onRefresh ? <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} /> : undefined}
          showsVerticalScrollIndicator={false}
        >
          {content}
        </ScrollView>
      ) : content}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scroll: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    padding: spacing.lg,
    gap: spacing.lg,
  },
});
