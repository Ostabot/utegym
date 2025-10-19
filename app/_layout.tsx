import { Stack } from 'expo-router';
import { AppProvider } from '@/providers/app-provider';
import { AuthBootstrapper } from '@/lib/auth-bootstrapper';

export default function RootLayout() {
  return (
    <AppProvider>
      <AuthBootstrapper />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      </Stack>
    </AppProvider>
  );
}
