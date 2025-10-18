
import { useEffect } from 'react';
import * as Linking from 'expo-linking';
import { supabase } from './supabase';

export function AuthBootstrapper() {
  useEffect(() => {
    // Handle mail magic-link callback in native
    const sub = Linking.addEventListener('url', async ({ url }) => {
      const { search } = new URL(url);
      await supabase.auth.exchangeCodeForSession({ queryParams: search, storeSession: true });
    });
    return () => { sub.remove(); };
  }, []);
  return null;
}
