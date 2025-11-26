import { QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';
import Toast from 'react-native-toast-message';
import type { ReactNode } from 'react';
import { queryClient } from 'src/lib/query-client';
import { SessionProvider } from 'src/contexts/session-context';
import { ThemeProvider, useThemePreference } from 'src/contexts/theme-context';
import { WorkoutWizardProvider } from 'src/contexts/workout-wizard-context';
import { usePendingWorkoutSync } from 'src/hooks/usePendingWorkoutSync';

function SyncBoundary() {
  usePendingWorkoutSync();
  return null;
}

function ThemeStatusBar() {
  const { resolved } = useThemePreference();
  return <StatusBar style={resolved === 'dark' ? 'light' : 'dark'} />;
}

export function AppProvider({ children }: { children: ReactNode }) {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <SessionProvider>
            <WorkoutWizardProvider>
              <SyncBoundary />
              <ThemeStatusBar />
              {children}
              <Toast position="bottom" bottomOffset={64} />
            </WorkoutWizardProvider>
          </SessionProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}
