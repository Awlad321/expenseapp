import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { documentDirectory, readAsStringAsync, StorageAccessFramework, writeAsStringAsync } from 'expo-file-system/legacy';
import { localDatabase } from './localDatabase';

const BACKUP_FOLDER_KEY = 'expensapp.backup.folder';
const LAST_BACKUP_DATE_KEY = 'expensapp.backup.last-date';

export const backupService = {
  async configureFolder() {
    if (Platform.OS !== 'android') {
      throw new Error('External backup folder selection is only available on Android in this build.');
    }
    const permission = await StorageAccessFramework.requestDirectoryPermissionsAsync();
    if (!permission.granted) {
      throw new Error('Backup folder permission was not granted.');
    }
    await SecureStore.setItemAsync(BACKUP_FOLDER_KEY, permission.directoryUri);
    return permission.directoryUri;
  },

  async backupNow() {
    const backup = await localDatabase.exportBackup();
    const fileName = backupFileName();

    if (Platform.OS === 'android') {
      const folderUri = await SecureStore.getItemAsync(BACKUP_FOLDER_KEY);
      if (!folderUri) {
        throw new Error('Choose a backup folder first.');
      }
      const fileUri = await StorageAccessFramework.createFileAsync(folderUri, fileName.replace('.json', ''), 'application/json');
      await StorageAccessFramework.writeAsStringAsync(fileUri, backup);
    } else {
      if (!documentDirectory) {
        throw new Error('Document directory is unavailable.');
      }
      await writeAsStringAsync(`${documentDirectory}${fileName}`, backup);
    }

    await SecureStore.setItemAsync(LAST_BACKUP_DATE_KEY, businessDate());
    return fileName;
  },

  async runDailyBackupIfDue() {
    const folderUri = await SecureStore.getItemAsync(BACKUP_FOLDER_KEY);
    if (Platform.OS === 'android' && !folderUri) {
      return false;
    }
    if (!isAfterBackupTime()) {
      return false;
    }
    const lastBackupDate = await SecureStore.getItemAsync(LAST_BACKUP_DATE_KEY);
    if (lastBackupDate === businessDate()) {
      return false;
    }
    await this.backupNow();
    return true;
  },

  async restoreLatestFromFolder() {
    if (Platform.OS !== 'android') {
      throw new Error('Folder restore is only available on Android in this build.');
    }
    const permission = await StorageAccessFramework.requestDirectoryPermissionsAsync();
    if (!permission.granted) {
      throw new Error('Restore folder permission was not granted.');
    }

    const files = await StorageAccessFramework.readDirectoryAsync(permission.directoryUri);
    const backupFiles = files
      .filter((uri) => /expensapp-backup-\d{4}-\d{2}-\d{2}\.json$/i.test(decodeURIComponent(uri)))
      .sort();

    const latest = backupFiles[backupFiles.length - 1];
    if (!latest) {
      throw new Error('No ExpensApp backup file found in this folder.');
    }

    const raw = await readAsStringAsync(latest);
    await localDatabase.importBackup(raw);
    await SecureStore.setItemAsync(BACKUP_FOLDER_KEY, permission.directoryUri);
    return latest;
  },
};

function backupFileName() {
  return `expensapp-backup-${businessDate()}.json`;
}

function businessDate() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

function isAfterBackupTime() {
  return new Date().getHours() >= 3;
}
