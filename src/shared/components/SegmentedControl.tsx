import { StyleSheet, View, ViewStyle } from 'react-native';
import { PrimaryButton } from './PrimaryButton';
import { spacing } from '../theme/theme';

export interface SegmentOption {
  label: string;
  value: string;
}

export function SegmentedControl({
  options,
  value,
  onChange,
  style,
  compact,
}: {
  options: SegmentOption[];
  value: string;
  onChange: (value: string) => void;
  style?: ViewStyle;
  compact?: boolean;
}) {
  return (
    <View style={[styles.row, style]}>
      {options.map((option) => (
        <PrimaryButton
          key={option.value}
          variant={value === option.value ? 'primary' : 'ghost'}
          onPress={() => onChange(option.value)}
          compact={compact}
          style={[styles.button, compact && styles.compactButton]}
        >
          {option.label}
        </PrimaryButton>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  button: {
    flex: 1,
    minHeight: 44,
  },
  compactButton: {
    minHeight: 38,
    paddingHorizontal: spacing.xs,
  },
});
