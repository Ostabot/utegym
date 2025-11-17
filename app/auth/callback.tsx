// app/auth/callback.tsx
import { useEffect } from 'react';
import { View, ActivityIndicator, Text } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import * as Linking from 'expo-linking';
import Toast from 'react-native-toast-message';
import { supabase } from '@/lib/supabase';
import { useAppTheme } from '@/ui/useAppTheme';

export default function AuthCallback() {
  const t = useAppTheme();
  const { code, error_description, error } = useLocalSearchParams<{
    code?: string;
    error_description?: string;
    error?: string;
  }>();

  useEffect(() => {
    let done = false;

    async function tryHandle(url?: string | null) {
      if (done) return;
      try {
        // 1) Providerfel?
        if (error || error_description) {
          Toast.show({ type: 'error', text1: 'Inloggning misslyckades', text2: String(error_description || error) });
          return;
        }

        // 2) PKCE: ?code=...
        if (code) {
          const { error: exchErr } = await supabase.auth.exchangeCodeForSession({ code: String(code) });
          if (exchErr) throw exchErr;
          Toast.show({ type: 'success', text1: 'Du är inloggad' });
          return;
        }

        // 3) Fragmentflöde: #access_token=... (vanligt med magic link på RN)
        //    Hämta *senaste* URL (inte bara initial), så funkar det även när appen redan är öppen.
        const u = url ?? (await Linking.getInitialURL());
        if (u && u.includes('#')) {
          const hash = u.split('#')[1];
          const params = new URLSearchParams(hash);
          const access_token = params.get('access_token') || undefined;
          const refresh_token = params.get('refresh_token') || undefined;

          if (access_token && refresh_token) {
            const { error: setErr } = await supabase.auth.setSession({ access_token, refresh_token });
            if (setErr) throw setErr;
            Toast.show({ type: 'success', text1: 'Du är inloggad' });
            return;
          }
        }

        // 4) Inget hittat
        Toast.show({ type: 'error', text1: 'Kunde inte logga in', text2: 'Saknar auth code' });
      } catch (e: any) {
        Toast.show({ type: 'error', text1: 'Kunde inte logga in', text2: e?.message });
      } finally {
        done = true;
        router.replace('/(tabs)/(profile)');
      }
    }

    // Lyssna på *aktuella* deeplinks (inte bara initialURL).
    const sub = Linking.addEventListener('url', (ev) => tryHandle(ev.url));
    tryHandle();

    return () => sub.remove();
  }, [code, error, error_description]);

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: t.colors.bg }}>
      <ActivityIndicator />
      <Text style={{ marginTop: 8, color: t.colors.subtext }}>Slutför inloggning…</Text>
    </View>
  );
}