import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Dimensions, Platform, StyleSheet, View } from 'react-native';
import { documentDirectory, StorageAccessFramework, writeAsStringAsync } from 'expo-file-system/legacy';
import { useFocusEffect } from '@react-navigation/native';
import { BarChart, LineChart } from 'react-native-chart-kit';
import { AppText } from '../../../shared/components/AppText';
import { Card } from '../../../shared/components/Card';
import { DatePickerField } from '../../../shared/components/DatePickerField';
import { Header } from '../../../shared/components/Header';
import { PrimaryButton } from '../../../shared/components/PrimaryButton';
import { Screen } from '../../../shared/components/Screen';
import { SegmentedControl } from '../../../shared/components/SegmentedControl';
import { colors, spacing } from '../../../shared/theme/theme';
import { currentMonth, formatMoney, today } from '../../../shared/utils/format';
import type { DashboardSummary, Transaction } from '../../../shared/types/api';
import { backupService } from '../../../services/api/backupService';
import { dashboardService } from '../../dashboard/services/dashboardService';
import { transactionService } from '../../transactions/services/transactionService';
import { useTheme } from '../../../shared/theme/ThemeContext';
import type { AppColors, ThemePreference } from '../../../shared/theme/theme';

type ReportPeriod = 'day' | 'month' | 'year';

const chartWidth = Math.max(Dimensions.get('window').width - 64, 280);
const monthLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const periodOptions = [
  { label: 'Day', value: 'day' },
  { label: 'Month', value: 'month' },
  { label: 'Year', value: 'year' },
];
const themeOptions = [
  { label: 'System', value: 'system' },
  { label: 'Light', value: 'light' },
  { label: 'Dark', value: 'dark' },
];

export function ReportsScreen() {
  const theme = useTheme();
  const [period, setPeriod] = useState<ReportPeriod>('month');
  const [selectedDate, setSelectedDate] = useState(today());
  const [selectedMonth, setSelectedMonth] = useState(currentMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [backupBusy, setBackupBusy] = useState(false);

  async function load() {
    try {
      const [summaryData, transactionData] = await Promise.all([
        dashboardService.summary(currentMonth()),
        transactionService.list(),
      ]);
      setSummary(summaryData);
      setTransactions(transactionData);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  async function refresh() {
    setRefreshing(true);
    await load();
  }

  useFocusEffect(useCallback(() => {
    load();
  }, []));

  async function exportCsv() {
    setExporting(true);
    try {
      const csv = await transactionService.exportCsv(selectedMonth);
      const filename = `expensapp-${selectedMonth}-income-expense.csv`;

      if (Platform.OS === 'web') {
        downloadCsvOnWeb(csv, filename);
      } else if (Platform.OS === 'android') {
        await saveCsvOnAndroid(csv, filename);
      } else {
        await saveCsvInAppDocuments(csv, filename);
      }
    } catch {
      Alert.alert('Export failed', 'Could not create the CSV file. Please try again.');
    } finally {
      setExporting(false);
    }
  }

  const report = buildReport(transactions, period, selectedDate, selectedMonth, selectedYear);
  const insights = buildInsights(report, period, theme.colors);
  const chartConfig = {
    backgroundGradientFrom: theme.colors.card,
    backgroundGradientTo: theme.colors.card,
    color: (opacity = 1) => withOpacity(theme.colors.primary, opacity),
    labelColor: (opacity = 1) => withOpacity(theme.colors.textMuted, opacity),
    propsForBackgroundLines: { stroke: theme.colors.border },
    decimalPlaces: 0,
    barPercentage: 0.68,
  };

  async function configureBackup() {
    setBackupBusy(true);
    try {
      await backupService.configureFolder();
      Alert.alert('Backup enabled', 'ExpensApp will write a backup after 3 AM when the app is opened or running.');
    } catch {
      Alert.alert('Backup setup failed', 'Could not access the selected backup folder.');
    } finally {
      setBackupBusy(false);
    }
  }

  async function backupNow() {
    setBackupBusy(true);
    try {
      const fileName = await backupService.backupNow();
      Alert.alert('Backup created', fileName);
    } catch {
      Alert.alert('Backup failed', 'Choose a backup folder first, then try again.');
    } finally {
      setBackupBusy(false);
    }
  }

  async function restoreBackup() {
    setBackupBusy(true);
    try {
      await backupService.restoreLatestFromFolder();
      await load();
      Alert.alert('Data restored', 'The latest ExpensApp backup from the selected folder was restored.');
    } catch {
      Alert.alert('Restore failed', 'No valid ExpensApp backup was found in the selected folder.');
    } finally {
      setBackupBusy(false);
    }
  }

  return (
    <Screen refreshing={refreshing} onRefresh={refresh}>
      <Header title="Reports" subtitle={`${periodLabel(period)} finance overview`} />
      <PrimaryButton loading={exporting} onPress={exportCsv}>Export CSV</PrimaryButton>
      <Card>
        <AppText variant="h2">Report period</AppText>
        <SegmentedControl compact options={periodOptions} value={period} onChange={(nextPeriod) => setPeriod(nextPeriod as ReportPeriod)} />
        {period === 'day' ? (
          <DatePickerField label="Day" value={selectedDate} onChange={setSelectedDate} />
        ) : period === 'month' ? (
          <MonthSelector month={selectedMonth} onChange={setSelectedMonth} />
        ) : (
          <YearSelector year={selectedYear} onChange={setSelectedYear} />
        )}
      </Card>
      <Card>
        <AppText variant="h2">Appearance</AppText>
        <SegmentedControl compact options={themeOptions} value={theme.preference} onChange={(value) => theme.setPreference(value as ThemePreference)} />
      </Card>
      <Card>
        <AppText variant="h2">Data backup</AppText>
        <AppText muted>Choose a phone folder outside the app. Daily backup runs after 3 AM when the app is opened or running.</AppText>
        <View style={styles.backupActions}>
          <PrimaryButton loading={backupBusy} onPress={configureBackup} style={styles.backupButton}>Choose Folder</PrimaryButton>
          <PrimaryButton variant="secondary" loading={backupBusy} onPress={backupNow} style={styles.backupButton}>Backup Now</PrimaryButton>
        </View>
        <PrimaryButton variant="secondary" loading={backupBusy} onPress={restoreBackup}>Restore Latest Backup</PrimaryButton>
      </Card>
      {loading ? <ActivityIndicator color={theme.colors.primary} /> : null}
      {!loading ? (
        <>
          <Card>
            <AppText variant="h2">Smart insights</AppText>
            {insights.map((insight) => (
              <View key={insight.label} style={[styles.insightRow, { backgroundColor: theme.colors.surface }]}>
                <View style={[styles.insightDot, { backgroundColor: insight.color }]} />
                <View style={styles.insightCopy}>
                  <AppText>{insight.label}</AppText>
                  <AppText variant="small" muted>{insight.value}</AppText>
                </View>
              </View>
            ))}
          </Card>
          <Card>
            <AppText variant="h2">Income vs expense</AppText>
            <BarChart
              data={{
                labels: ['Income', 'Expense'],
                datasets: [{ data: [report.totalIncome, report.totalExpense], colors: [() => theme.colors.income, () => theme.colors.expense] }],
              }}
              width={chartWidth}
              height={210}
              yAxisLabel="৳"
              yAxisSuffix=""
              chartConfig={chartConfig}
              fromZero
              showValuesOnTopOfBars
              withCustomBarColorFromData
              flatColor
              style={styles.chart}
            />
            <View style={styles.row}>
              <AppText>Savings</AppText>
              <AppText style={{ color: report.savings >= 0 ? theme.colors.income : theme.colors.expense }}>{formatMoney(report.savings)}</AppText>
            </View>
          </Card>
          <Card>
            <AppText variant="h2">{period === 'day' ? 'Day total' : 'Expense trend'}</AppText>
            <LineChart
              data={{
                labels: report.trendLabels,
                datasets: [{ data: report.expenseTrend }],
              }}
              width={chartWidth}
              height={220}
              yAxisLabel="৳"
              yAxisSuffix=""
              chartConfig={{
                ...chartConfig,
                color: (opacity = 1) => withOpacity(theme.colors.expense, opacity),
              }}
              bezier
              fromZero
              style={styles.chart}
            />
          </Card>
          <Card>
            <AppText variant="h2">Top spending categories</AppText>
            {report.expenseByCategory.length === 0 ? <AppText muted>No category spending yet.</AppText> : report.expenseByCategory.slice(0, 6).map((item) => (
              <Bar key={item.category} label={item.category} value={item.amount} max={Math.max(...report.expenseByCategory.map((category) => category.amount), 1)} color={theme.colors.expense} />
            ))}
          </Card>
          {summary ? <Card>
            <AppText variant="h2">Account balance summary</AppText>
            {summary.accountBalances.map((item) => (
              <View key={item.accountId} style={styles.row}>
                <AppText>{item.accountName}</AppText>
                <AppText>{formatMoney(item.balance)}</AppText>
              </View>
            ))}
          </Card> : null}
        </>
      ) : null}
    </Screen>
  );
}

function MonthSelector({ month, onChange }: { month: string; onChange: (month: string) => void }) {
  const [year, monthValue] = month.split('-').map(Number);

  function move(amount: number) {
    const date = new Date(year, monthValue - 1 + amount, 1);
    onChange(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`);
  }

  return (
    <View style={styles.selectorRow}>
      <PrimaryButton variant="ghost" onPress={() => move(-1)} style={styles.selectorButton}>Prev</PrimaryButton>
      <View style={styles.selectorValue}>
        <AppText variant="h2">{monthLabels[monthValue - 1]} {year}</AppText>
      </View>
      <PrimaryButton variant="ghost" onPress={() => move(1)} style={styles.selectorButton}>Next</PrimaryButton>
    </View>
  );
}

function YearSelector({ year, onChange }: { year: number; onChange: (year: number) => void }) {
  return (
    <View style={styles.selectorRow}>
      <PrimaryButton variant="ghost" onPress={() => onChange(year - 1)} style={styles.selectorButton}>Prev</PrimaryButton>
      <View style={styles.selectorValue}>
        <AppText variant="h2">{year}</AppText>
      </View>
      <PrimaryButton variant="ghost" onPress={() => onChange(year + 1)} style={styles.selectorButton}>Next</PrimaryButton>
    </View>
  );
}

function buildReport(transactions: Transaction[], period: ReportPeriod, selectedDate: string, selectedMonth: string, selectedYear: number) {
  const filtered = transactions.filter((transaction) => {
    if (period === 'day') return transaction.transactionDate === selectedDate;
    if (period === 'month') return transaction.transactionDate.startsWith(selectedMonth);
    return transaction.transactionDate.startsWith(`${selectedYear}`);
  });
  const totalIncome = sumByType(filtered, 'INCOME');
  const totalExpense = sumByType(filtered, 'EXPENSE');
  const expenseByCategory = Array.from(
    filtered
      .filter((transaction) => transaction.type === 'EXPENSE')
      .reduce((map, transaction) => map.set(transaction.categoryName, (map.get(transaction.categoryName) ?? 0) + transaction.amount), new Map<string, number>())
      .entries()
  )
    .map(([category, amount]) => ({ category, amount }))
    .sort((a, b) => b.amount - a.amount);
  const { labels, values } = buildExpenseTrend(filtered, period, selectedDate, selectedMonth, selectedYear);

  return {
    totalIncome,
    totalExpense,
    savings: totalIncome - totalExpense,
    expenseByCategory,
    trendLabels: labels,
    expenseTrend: values,
    transactionCount: filtered.length,
  };
}

function buildInsights(report: ReturnType<typeof buildReport>, period: ReportPeriod, palette: AppColors) {
  const topCategory = report.expenseByCategory[0];
  const savingsRate = report.totalIncome > 0 ? Math.round((report.savings / report.totalIncome) * 100) : 0;
  const highestExpense = Math.max(...report.expenseTrend, 0);
  return [
    {
      label: report.savings >= 0 ? 'Positive savings' : 'Overspent',
      value: report.totalIncome > 0 ? `${savingsRate}% savings rate for this ${period}` : 'Add income to see savings rate',
      color: report.savings >= 0 ? palette.income : palette.expense,
    },
    {
      label: topCategory ? `Top category: ${topCategory.category}` : 'No spending yet',
      value: topCategory ? `${formatMoney(topCategory.amount)} spent` : 'This period has no expense entries',
      color: palette.expense,
    },
    {
      label: report.transactionCount === 0 ? 'No activity' : `${report.transactionCount} entries`,
      value: highestExpense > 0 ? `Highest trend point: ${formatMoney(highestExpense)}` : 'Your selected period is calm',
      color: palette.accent,
    },
  ];
}

function buildExpenseTrend(transactions: Transaction[], period: ReportPeriod, selectedDate: string, selectedMonth: string, selectedYear: number) {
  const expenses = transactions.filter((transaction) => transaction.type === 'EXPENSE');
  if (period === 'day') {
    return { labels: ['Income', 'Expense'], values: [sumByType(transactions, 'INCOME'), sumByType(transactions, 'EXPENSE')] };
  }
  if (period === 'year') {
    const values = Array.from({ length: 12 }, (_, index) => sumByDatePrefix(expenses, `${selectedYear}-${String(index + 1).padStart(2, '0')}`));
    return { labels: monthLabels, values: values.map(positiveChartValue) };
  }

  const [year, month] = selectedMonth.split('-').map(Number);
  const daysInMonth = new Date(year, month, 0).getDate();
  const weekBuckets = [0, 0, 0, 0, 0];
  expenses.forEach((transaction) => {
    const day = Number(transaction.transactionDate.slice(8, 10));
    const bucket = Math.min(Math.floor((day - 1) / 7), 4);
    weekBuckets[bucket] += transaction.amount;
  });
  const labels = ['1-7', '8-14', '15-21', '22-28', `29-${daysInMonth}`];
  return { labels, values: weekBuckets.map(positiveChartValue) };
}

function sumByType(transactions: Transaction[], type: Transaction['type']) {
  return transactions.filter((transaction) => transaction.type === type).reduce((sum, transaction) => sum + transaction.amount, 0);
}

function sumByDatePrefix(transactions: Transaction[], prefix: string) {
  return transactions.filter((transaction) => transaction.transactionDate.startsWith(prefix)).reduce((sum, transaction) => sum + transaction.amount, 0);
}

function positiveChartValue(value: number) {
  return value > 0 ? value : 0;
}

function periodLabel(period: ReportPeriod) {
  if (period === 'day') return 'Daily';
  if (period === 'year') return 'Yearly';
  return 'Monthly';
}

function withOpacity(hex: string, opacity: number) {
  const normalized = hex.replace('#', '');
  if (normalized.length !== 6) return hex;
  const alpha = Math.round(opacity * 255).toString(16).padStart(2, '0');
  return `#${normalized}${alpha}`;
}

function downloadCsvOnWeb(csv: string, filename: string) {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

async function saveCsvOnAndroid(csv: string, filename: string) {
  const permissions = await StorageAccessFramework.requestDirectoryPermissionsAsync();
  if (!permissions.granted) {
    await saveCsvInAppDocuments(csv, filename);
    return;
  }

  const fileUri = await StorageAccessFramework.createFileAsync(permissions.directoryUri, filename.replace('.csv', ''), 'text/csv');
  await StorageAccessFramework.writeAsStringAsync(fileUri, csv);
  Alert.alert('CSV exported', 'The report was saved to the selected folder.');
}

async function saveCsvInAppDocuments(csv: string, filename: string) {
  if (!documentDirectory) {
    throw new Error('Document directory is not available');
  }
  const fileUri = `${documentDirectory}${filename}`;
  await writeAsStringAsync(fileUri, csv);
  Alert.alert('CSV exported', `Saved as ${filename}`);
}

function Bar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  return (
    <View style={styles.barBlock}>
      <View style={styles.row}>
        <AppText>{label}</AppText>
        <AppText>{formatMoney(value)}</AppText>
      </View>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${Math.max((value / max) * 100, 3)}%`, backgroundColor: color }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  barBlock: {
    gap: spacing.sm,
  },
  track: {
    height: 10,
    borderRadius: 10,
    backgroundColor: colors.surfaceMuted,
    overflow: 'hidden',
  },
  fill: {
    height: 10,
    borderRadius: 10,
  },
  chart: {
    borderRadius: 16,
    marginLeft: -spacing.sm,
  },
  selectorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  selectorButton: {
    minHeight: 44,
    minWidth: 82,
  },
  selectorValue: {
    flex: 1,
    alignItems: 'center',
  },
  backupActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  backupButton: {
    flex: 1,
  },
  insightRow: {
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
  },
  insightDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  insightCopy: {
    flex: 1,
    gap: spacing.xs,
  },
});
