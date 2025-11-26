// app/_layout.tsx
import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Stack } from 'expo-router';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { QueryClientProvider } from '@tanstack/react-query';
import { persistQueryClient } from '@tanstack/react-query-persist-client';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import Toast from 'react-native-toast-message';
import { useTranslation } from 'react-i18next';
import NetInfo from '@react-native-community/netinfo';

import { initI18n } from 'src/lib/i18n';
import { supabase } from 'src/lib/supabase';
import { queryClient } from 'src/lib/queryClient';

import { SessionProvider } from 'src/contexts/session-context';
import { WorkoutWizardProvider } from 'src/contexts/workout-wizard-context';
import CurrentRunProvider from 'src/contexts/current-run-context';

import { ThemeProvider as PreferenceThemeProvider } from 'src/contexts/theme-context';
import { ThemeProvider as AppThemeProvider } from 'src/ui/ThemeProvider';
import { useAppTheme } from 'src/ui/useAppTheme';
import { makeToastConfig } from 'src/ui/toastConfig';

const GUEST_KEY = 'utegym.guestMode';

// Krävs för OAuth/magic link i dev client / web
WebBrowser.maybeCompleteAuthSession();

// -------- React Query persistence --------
const persister = createAsyncStoragePersister({ storage: AsyncStorage });
persistQueryClient({ queryClient, persister, maxAge: 86_400_000 }); // 24h

export default function RootLayout() {
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
      const reachable =
        state.isInternetReachable === null || state.isInternetReachable === undefined
          ? state.isConnected
          : state.isConnected && state.isInternetReachable;
      setIsConnected(reachable ?? false);
    });
    return () => sub();
  }, []);

  if (isConnected === null || isConnected) return null;

  const title = t('network.offline.title', 'Offline');
  const body = t('network.offline.body', 'Ingen internetanslutning – vissa funktioner kanske inte fungerar.');

  return (
    <View
      pointerEvents="box-none"
      style={[
        styles.offlineBanner,
        { backgroundColor: theme.colors.card, borderColor: theme.colors.error },
      ]}
      accessible
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      accessibilityLabel={t('network.offline.a11yLabel', '{{title}}. {{body}}', { title, body })}
    >
      <Text style={{ color: theme.colors.text, fontWeight: '700', fontSize: 12 }}>{title}</Text>
      <Text style={{ color: theme.colors.subtext, fontSize: 11 }}>{body}</Text>
    </View>
  );
}

function ThemedRoot() {
  const tTheme = useAppTheme();
  const { t } = useTranslation();
  const [i18nReady, setI18nReady] = useState(false);

  // Init i18n på toppnivå
  useEffect(() => {
    let mounted = true;
    Promise.resolve(initI18n()).then(() => mounted && setI18nReady(true));
    return () => { mounted = false; };
  }, []);

  // 🔗 Fånga OAuth/magic-link – sätt session och lämna gästläge vid lyckad inloggning
  useEffect(() => {
    async function handle(url?: string | null) {
      try {
        const u = url ?? (await Linking.getInitialURL());
        if (!u || !u.startsWith("utegym://auth/callback")) return;

        // --- 1) Prova PKCE / OAuth ---
        const { data, error } = await supabase.auth.exchangeCodeForSession({ code: u });
        if (!error) {
          await AsyncStorage.removeItem(GUEST_KEY);
          Toast.show({ type: "success", text1: t("auth.loggedIn", "Du är inloggad") });
          return;
        }

        // --- 2) Fallback: magic link (#access_token=...) ---
        if (u.includes("#")) {
          const hash = u.split("#")[1];
          const qs = new URLSearchParams(hash);
          const access_token = qs.get("access_token") ?? undefined;
          const refresh_token = qs.get("refresh_token") ?? undefined;

          if (access_token && refresh_token) {
            const { error: e2 } = await supabase.auth.setSession({
              access_token,
              refresh_token,
            });
            if (e2) throw e2;
            await AsyncStorage.removeItem(GUEST_KEY);
            Toast.show({ type: "success", text1: t("auth.loggedIn", "Du är inloggad") });
            return;
          }
        }

        Toast.show({
          type: "error",
          text1: t("auth.loginFailed", "Kunde inte logga in"),
          text2: t("auth.missingCode", "Saknar auth code"),
        });
      } catch (e: any) {
        Toast.show({
          type: "error",
          text1: t("auth.loginFailed", "Kunde inte logga in"),
          text2: String(e?.message ?? e),
        });
      }
    }

    const sub = Linking.addEventListener("url", (ev) => handle(ev.url));
    handle();
    return () => sub.remove();
  }, [t]);

  if (!i18nReady) {
    return <View style={[StyleSheet.absoluteFill, { backgroundColor: tTheme.colors.bg }]} />;
  }

  return (
    <>
      <View style={[StyleSheet.absoluteFill, { backgroundColor: tTheme.colors.bg }]} />
      <QueryClientProvider client={queryClient}>
        <SessionProvider>
          <WorkoutWizardProvider>
            <CurrentRunProvider>
              <GlobalOfflineBanner />
              <Stack
                screenOptions={{
                  headerShown: false,
                  contentStyle: { backgroundColor: tTheme.colors.bg },
                }}
              >
                <Stack.Screen name="onboarding" options={{ headerShown: false }} />
                <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                <Stack.Screen name="run" options={{ headerShown: false }} />
                <Stack.Screen name="auth/callback" options={{ headerShown: false }} />
              </Stack>
              <Toast config={makeToastConfig(tTheme)} position="bottom" visibilityTime={1800} bottomOffset={72} />
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
    top: 0, left: 0, right: 0,
    paddingVertical: 6, paddingHorizontal: 12,
    borderBottomWidth: 1, zIndex: 999,
    alignItems: 'center', justifyContent: 'center', gap: 2,
  },
});