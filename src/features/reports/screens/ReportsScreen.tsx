import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Platform, StyleSheet, View } from 'react-native';
import { documentDirectory, StorageAccessFramework, writeAsStringAsync } from 'expo-file-system/legacy';
import { useFocusEffect } from '@react-navigation/native';
import { AppText } from '../../../shared/components/AppText';
import { Card } from '../../../shared/components/Card';
import { Header } from '../../../shared/components/Header';
import { PrimaryButton } from '../../../shared/components/PrimaryButton';
import { Screen } from '../../../shared/components/Screen';
import { colors, spacing } from '../../../shared/theme/theme';
import { currentMonth, formatMoney } from '../../../shared/utils/format';
import type { DashboardSummary } from '../../../shared/types/api';
import { backupService } from '../../../services/api/backupService';
import { dashboardService } from '../../dashboard/services/dashboardService';
import { transactionService } from '../../transactions/services/transactionService';

export function ReportsScreen() {
  const month = currentMonth();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [backupBusy, setBackupBusy] = useState(false);

  async function load() {
    try {
      setSummary(await dashboardService.summary(month));
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
      const csv = await transactionService.exportCsv(month);
      const filename = `expensapp-${month}-income-expense.csv`;

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
      <Header title="Reports" subtitle="Monthly finance overview" />
      <PrimaryButton loading={exporting} onPress={exportCsv}>Export CSV</PrimaryButton>
      <Card>
        <AppText variant="h2">Data backup</AppText>
        <AppText muted>Choose a phone folder outside the app. Daily backup runs after 3 AM when the app is opened or running.</AppText>
        <View style={styles.backupActions}>
          <PrimaryButton loading={backupBusy} onPress={configureBackup} style={styles.backupButton}>Choose Folder</PrimaryButton>
          <PrimaryButton variant="ghost" loading={backupBusy} onPress={backupNow} style={styles.backupButton}>Backup Now</PrimaryButton>
        </View>
        <PrimaryButton variant="ghost" loading={backupBusy} onPress={restoreBackup}>Restore Latest Backup</PrimaryButton>
      </Card>
      {loading ? <ActivityIndicator color={colors.primary} /> : null}
      {summary ? (
        <>
          <Card>
            <AppText variant="h2">Income vs expense</AppText>
            <Bar label="Income" value={summary.totalIncome} max={Math.max(summary.totalIncome, summary.totalExpense, 1)} color={colors.income} />
            <Bar label="Expense" value={summary.totalExpense} max={Math.max(summary.totalIncome, summary.totalExpense, 1)} color={colors.expense} />
            <View style={styles.row}>
              <AppText>Savings</AppText>
              <AppText style={{ color: summary.monthlySavings >= 0 ? colors.income : colors.expense }}>{formatMoney(summary.monthlySavings)}</AppText>
            </View>
          </Card>
          <Card>
            <AppText variant="h2">Top spending categories</AppText>
            {summary.expenseByCategory.length === 0 ? <AppText muted>No category spending yet.</AppText> : summary.expenseByCategory.slice(0, 5).map((item) => (
              <View key={item.category} style={styles.row}>
                <AppText>{item.category}</AppText>
                <AppText>{formatMoney(item.amount)}</AppText>
              </View>
            ))}
          </Card>
          <Card>
            <AppText variant="h2">Account balance summary</AppText>
            {summary.accountBalances.map((item) => (
              <View key={item.accountId} style={styles.row}>
                <AppText>{item.accountName}</AppText>
                <AppText>{formatMoney(item.balance)}</AppText>
              </View>
            ))}
          </Card>
        </>
      ) : null}
    </Screen>
  );
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
  backupActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  backupButton: {
    flex: 1,
  },
});
