import { ReactNode, useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from './AuthContext';
import { backupService } from '../../services/api/backupService';

export function AppProviders({ children }: { children: ReactNode }) {
  useEffect(() => {
    backupService.runDailyBackupIfDue().catch(() => {
      // Backup is best-effort and should never block app startup.
    });
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AuthProvider>{children}</AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
