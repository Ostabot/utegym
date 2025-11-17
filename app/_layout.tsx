// app/_layout.tsx
import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Stack } from 'expo-router';

import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import * as Sentry from 'sentry-expo';
import Constants from 'expo-constants';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { QueryClientProvider } from '@tanstack/react-query';
import { persistQueryClient } from '@tanstack/react-query-persist-client';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';

import Toast from 'react-native-toast-message';
import { useTranslation } from 'react-i18next';

import NetInfo from '@react-native-community/netinfo';

import { initI18n } from '@/lib/i18n';
import { supabase } from '@/lib/supabase';
import { queryClient } from '@/lib/queryClient';

import { SessionProvider } from '@/contexts/session-context';
import { WorkoutWizardProvider } from '@/contexts/workout-wizard-context';
import CurrentRunProvider from '@/contexts/current-run-context';

import { ThemeProvider as PreferenceThemeProvider } from '@/contexts/theme-context';
import { ThemeProvider as AppThemeProvider } from '@/ui/ThemeProvider';
import { useAppTheme } from '@/ui/useAppTheme';
import { makeToastConfig } from '@/ui/toastConfig';

// ---------- Sentry init ----------
Sentry.init({
  dsn: Constants.expoConfig?.extra?.sentryDsn as string | undefined,
  enableInExpoDevelopment: true,
  debug: __DEV__,
  tracesSampleRate: 0.1,
  enableNative: true,
  enableInExpoGo: true,
});

// Krävs för OAuth/magic link i dev client
WebBrowser.maybeCompleteAuthSession();

// -------- React Query persistence (kopplad till global client) --------
const persister = createAsyncStoragePersister({ storage: AsyncStorage });
persistQueryClient({ queryClient, persister, maxAge: 86_400_000 }); // 24h

// Vi gör en inner-komponent och wrappar den med Sentry nedanför
function RootLayoutInner() {
  return (
    <PreferenceThemeProvider>
      <AppThemeProvider>
        <ThemedRoot />
      </AppThemeProvider>
    </PreferenceThemeProvider>
  );
}

// 🔌 Global offline-banner
function GlobalOfflineBanner() {
  const theme = useAppTheme();
  const { t } = useTranslation();
  const [isConnected, setIsConnected] = useState<boolean | null>(null);

  useEffect(() => {
    const sub = NetInfo.addEventListener((state) => {
      // isInternetReachable kan vara null i början – tolka då bara isConnected
      const reachable =
        state.isInternetReachable === null || state.isInternetReachable === undefined
          ? state.isConnected
          : state.isConnected && state.isInternetReachable;

      setIsConnected(reachable ?? false);
    });

    return () => sub();
  }, []);

  // Visa inget innan vi vet, eller när vi är online
  if (isConnected === null || isConnected) return null;

  const title = t('network.offline.title', 'Offline');
  const body = t(
    'network.offline.body',
    'Ingen internetanslutning – vissa funktioner kanske inte fungerar.'
  );

  return (
    <View
      // Låt bannern vara läsbar för skärmläsare men inte blockera touch
      pointerEvents="box-none"
      style={[
        styles.offlineBanner,
        {
          backgroundColor: theme.colors.card,
          borderColor: theme.colors.error,
        },
      ]}
      accessible
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      accessibilityLabel={t(
        'network.offline.a11yLabel',
        '{{title}}. {{body}}',
        { title, body }
      )}
    >
      <Text
        style={{
          color: theme.colors.text,
          fontWeight: '700',
          fontSize: 12,
        }}
      >
        {title}
      </Text>
      <Text
        style={{
          color: theme.colors.subtext,
          fontSize: 11,
        }}
      >
        {body}
      </Text>
    </View>
  );
}

function ThemedRoot() {
  const tTheme = useAppTheme();
  const { t } = useTranslation();
  const [i18nReady, setI18nReady] = useState(false);

  // Init i18n på toppnivå och vänta tills klart (undvik språk-blink)
  useEffect(() => {
    let mounted = true;
    Promise.resolve(initI18n()).then(() => {
      if (mounted) setI18nReady(true);
    });
    return () => {
      mounted = false;
    };
  }, []);

  // 🔗 Global deeplink-hanterare – fångar både PKCE (?code=) och fragment (#access_token)
  useEffect(() => {
    async function handleAuthDeepLink(url?: string | null) {
      try {
        const u = url ?? (await Linking.getInitialURL());
        if (!u) return;

        // Säkerställ att det är vår callback
        if (!u.startsWith('utegym://auth/callback')) return;

        // --- 1) PKCE: ?code=... ---
        const q = u.includes('?') ? u.split('?')[1].split('#')[0] : '';
        const qs = new URLSearchParams(q);
        const code = qs.get('code');

        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession({ code });
          if (error) throw error;
          Toast.show({ type: 'success', text1: t('auth.loggedIn', 'Du är inloggad') });
          return;
        }

        // --- 2) Magic link: #access_token=...&refresh_token=... ---
        if (u.includes('#')) {
          const hash = u.split('#')[1];
          const hs = new URLSearchParams(hash);
          const access_token = hs.get('access_token') ?? undefined;
          const refresh_token = hs.get('refresh_token') ?? undefined;

          if (access_token && refresh_token) {
            const { error } = await supabase.auth.setSession({ access_token, refresh_token });
            if (error) throw error;
            Toast.show({ type: 'success', text1: t('auth.loggedIn', 'Du är inloggad') });
            return;
          }
        }

        // Om vi kom hit saknas auth-data
        Toast.show({
          type: 'error',
          text1: t('auth.loginFailed', 'Kunde inte logga in'),
          text2: t('auth.missingCode', 'Saknar auth code'),
        });
      } catch (e: any) {
        Toast.show({
          type: 'error',
          text1: t('auth.loginFailed', 'Kunde inte logga in'),
          text2: String(e?.message ?? e),
        });
      }
    }

    // Fånga deeplinks både när appen redan är igång och vid kallstart
    const sub = Linking.addEventListener('url', (ev) => handleAuthDeepLink(ev.url));
    handleAuthDeepLink();

    return () => sub.remove();
  }, [t]);

  // Visa neutral yta tills i18n är redo (respekterar aktuellt tema)
  if (!i18nReady) {
    return <View style={[StyleSheet.absoluteFill, { backgroundColor: tTheme.colors.bg }]} />;
  }

  return (
    <>
      {/* Global background så inget vitt blinkar bakom navigeringen */}
      <View style={[StyleSheet.absoluteFill, { backgroundColor: tTheme.colors.bg }]} />

      <QueryClientProvider client={queryClient}>
        <SessionProvider>
          <WorkoutWizardProvider>
            <CurrentRunProvider>
              {/* 🌐 Global offline-banner – visas ovanpå allt */}
              <GlobalOfflineBanner />

              <Stack
                screenOptions={{
                  headerShown: false,
                  contentStyle: { backgroundColor: tTheme.colors.bg },
                }}
              >
                <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                <Stack.Screen name="run" options={{ headerShown: false }} />
                {/* 🔑 Route finns kvar som fallback */}
                <Stack.Screen name="auth/callback" options={{ headerShown: false }} />
              </Stack>

              {/* Global Toast (tema-aware) */}
              <Toast
                config={makeToastConfig(tTheme)}
                position="bottom"
                visibilityTime={1800}
                bottomOffset={72}
              />

              <StatusBar style={tTheme.name === 'dark' ? 'light' : 'dark'} />
            </CurrentRunProvider>
          </WorkoutWizardProvider>
        </SessionProvider>
      </QueryClientProvider>
    </>
  );
}

const styles = StyleSheet.create({
  offlineBanner: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    zIndex: 999,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
});

// 👇 Viktigt: exportera Sentry-wrap:ad root
export default Sentry.Native.wrap(RootLayoutInner);