import { useMemo, useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from './AppText';
import { colors, radius, spacing } from '../theme/theme';
import { today } from '../utils/format';

interface DatePickerFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
}

const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export function DatePickerField({ label, value, onChange, error }: DatePickerFieldProps) {
  const [visible, setVisible] = useState(false);
  const selectedDate = parseDate(value) ?? parseDate(today())!;
  const [visibleMonth, setVisibleMonth] = useState(() => new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1));
  const days = useMemo(() => getCalendarDays(visibleMonth), [visibleMonth]);
  const todayValue = today();

  function open() {
    setVisibleMonth(new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1));
    setVisible(true);
  }

  function moveMonth(amount: number) {
    setVisibleMonth((current) => new Date(current.getFullYear(), current.getMonth() + amount, 1));
  }

  function selectDate(date: Date) {
    onChange(formatDate(date));
    setVisible(false);
  }

  return (
    <View style={styles.wrap}>
      <AppText variant="small" muted>{label}</AppText>
      <Pressable onPress={open} style={[styles.input, error && styles.inputError]}>
        <AppText>{value}</AppText>
        <Ionicons name="calendar-outline" size={20} color={colors.primary} />
      </Pressable>
      {error ? <AppText variant="small" style={styles.error}>{error}</AppText> : null}

      <Modal visible={visible} transparent animationType="fade" onRequestClose={() => setVisible(false)}>
        <View style={styles.backdrop}>
          <View style={styles.panel}>
            <View style={styles.header}>
              <Pressable onPress={() => moveMonth(-1)} style={styles.iconButton}>
                <Ionicons name="chevron-back" size={22} color={colors.text} />
              </Pressable>
              <View style={styles.monthTitle}>
                <AppText variant="h2">{monthNames[visibleMonth.getMonth()]}</AppText>
                <AppText variant="small" muted>{visibleMonth.getFullYear()}</AppText>
              </View>
              <Pressable onPress={() => moveMonth(1)} style={styles.iconButton}>
                <Ionicons name="chevron-forward" size={22} color={colors.text} />
              </Pressable>
            </View>

            <View style={styles.weekRow}>
              {weekDays.map((day) => (
                <AppText key={day} variant="small" muted style={styles.weekDay}>{day}</AppText>
              ))}
            </View>

            <View style={styles.grid}>
              {days.map((date) => {
                const dateValue = formatDate(date);
                const selected = dateValue === value;
                const currentMonth = date.getMonth() === visibleMonth.getMonth();
                const isToday = dateValue === todayValue;

                return (
                  <Pressable
                    key={dateValue}
                    onPress={() => selectDate(date)}
                    style={styles.day}
                  >
                    <View style={[styles.dayBadge, selected && styles.selectedDay, isToday && !selected && styles.todayDay]}>
                      <AppText
                        variant="small"
                        style={[
                          styles.dayText,
                          !currentMonth && styles.mutedDayText,
                          selected && styles.selectedDayText,
                          isToday && !selected && styles.todayDayText,
                        ]}
                      >
                        {date.getDate()}
                      </AppText>
                    </View>
                  </Pressable>
                );
              })}
            </View>

            <View style={styles.actions}>
              <Pressable onPress={() => selectDate(parseDate(todayValue)!)} style={styles.actionButton}>
                <AppText variant="small" style={styles.actionText}>Today</AppText>
              </Pressable>
              <Pressable onPress={() => setVisible(false)} style={styles.actionButton}>
                <AppText variant="small">Cancel</AppText>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function getCalendarDays(month: Date) {
  const start = new Date(month.getFullYear(), month.getMonth(), 1);
  start.setDate(start.getDate() - start.getDay());

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return date;
  });
}

function parseDate(value: string) {
  const parts = value.split('-').map(Number);
  if (parts.length !== 3 || parts.some(Number.isNaN)) {
    return null;
  }
  return new Date(parts[0], parts[1] - 1, parts[2]);
}

function formatDate(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
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
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  inputError: {
    borderColor: colors.danger,
  },
  error: {
    color: colors.danger,
  },
  backdrop: {
    flex: 1,
    justifyContent: 'center',
    padding: spacing.lg,
    backgroundColor: 'rgba(0,0,0,0.72)',
  },
  panel: {
    gap: spacing.lg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    padding: spacing.lg,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceMuted,
  },
  monthTitle: {
    alignItems: 'center',
    flex: 1,
    gap: spacing.xs,
  },
  weekRow: {
    flexDirection: 'row',
  },
  weekDay: {
    flex: 1,
    textAlign: 'center',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: spacing.sm,
  },
  day: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayBadge: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedDay: {
    backgroundColor: colors.primary,
  },
  todayDay: {
    borderWidth: 1,
    borderColor: colors.primary,
  },
  dayText: {
    color: colors.text,
  },
  mutedDayText: {
    color: colors.textMuted,
    opacity: 0.55,
  },
  selectedDayText: {
    color: colors.background,
    fontWeight: '800',
  },
  todayDayText: {
    color: colors.primary,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
  },
  actionButton: {
    minHeight: 40,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.surfaceMuted,
  },
  actionText: {
    color: colors.primary,
  },
});
