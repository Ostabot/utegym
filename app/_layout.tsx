import '@/lib/mapbox'; // <-- ser till att setAccessToken körs
import { Stack } from 'expo-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '@/contexts/theme-context';

const qc = new QueryClient();

export default function RootLayout() {
  return (
    <QueryClientProvider client={qc}>
      <ThemeProvider>
        <Stack screenOptions={{ headerShown: false }}>
          {/* Viktigt: deklarera (tabs) som barn till Stack */}
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        </Stack>
      </ThemeProvider>
    </QueryClientProvider>
  );
}