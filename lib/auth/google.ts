// lib/auth/google.ts
import * as WebBrowser from 'expo-web-browser';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/lib/supabase';

const AUTH_REDIRECT = 'utegym://auth/callback';
const GUEST_KEY = 'utegym.guestMode';

export async function startGoogleOAuth() {
  // 1) Hämta OAuth-URL utan autoredirect
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: AUTH_REDIRECT,
      skipBrowserRedirect: true,           // ← kritiskt för stabilt flöde
      queryParams: { prompt: 'select_account' },
    },
  });
  if (error) throw error;
  if (!data?.url) throw new Error('Missing OAuth URL from Supabase.');

  // 2) Starta auth-sessionen i webbläsaren och vänta på deeplink
  await WebBrowser.maybeCompleteAuthSession();
  const res = await WebBrowser.openAuthSessionAsync(data.url, AUTH_REDIRECT);
  if (res.type === 'dismiss') return { cancelled: true }; // användaren stängde

  // 3) Efter deeplink ska _layout.tsx ha satt sessionen via exchangeCodeForSession
  const { data: sess } = await supabase.auth.getSession();
  if (!sess.session) {
    throw new Error('Ingen session efter Google-inloggning. Kontrollera redirect-URL i Supabase.');
  }

  await AsyncStorage.removeItem(GUEST_KEY);
  return { cancelled: false };
}