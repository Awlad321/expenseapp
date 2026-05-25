import { TextInput, StyleSheet, TextInputProps, View } from 'react-native';
import { colors, radius, spacing } from '../theme/theme';
import { AppText } from './AppText';
import { useTheme } from '../theme/ThemeContext';
import { useResponsiveLayout } from '../layout/responsive';

interface FormInputProps extends TextInputProps {
  label: string;
  error?: string;
}

export function FormInput({ label, error, ...props }: FormInputProps) {
  const theme = useTheme();
  const layout = useResponsiveLayout();
  return (
    <View style={styles.wrap}>
      <AppText variant="small" muted>{label}</AppText>
      <TextInput
        placeholderTextColor={theme.colors.textMuted}
        style={[
          styles.input,
          { minHeight: layout.inputHeight, paddingHorizontal: layout.compact ? spacing.md : spacing.lg, backgroundColor: theme.colors.surface, borderColor: theme.colors.border, color: theme.colors.text },
          error && { borderColor: theme.colors.danger },
        ]}
        {...props}
      />
      {error ? <AppText variant="small" style={{ color: theme.colors.danger }}>{error}</AppText> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.sm,
  },
  input: {
    minHeight: 52,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    color: colors.text,
    paddingHorizontal: spacing.lg,
    fontSize: 15,
  },
  inputError: {
    borderColor: colors.danger,
  },
  error: {
    color: colors.danger,
  },
});
