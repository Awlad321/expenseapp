import { ReactNode, useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from './AuthContext';
import { backupService } from '../../services/api/backupService';
import { ThemeProvider } from '../../shared/theme/ThemeContext';

export function AppProviders({ children }: { children: ReactNode }) {
  useEffect(() => {
    backupService.runDailyBackupIfDue().catch(() => {
      // Backup is best-effort and should never block app startup.
    });
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <AuthProvider>{children}</AuthProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
