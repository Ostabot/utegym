
import { useEffect } from 'react';
import * as Linking from 'expo-linking';
import { supabase } from './supabase';

async function handleUrl(url: string | null) {
  if (!url) return;
  try {
    const parsed = new URL(url);
    const queryParams = parsed.search;
    if (queryParams.includes('code=')) {
      await supabase.auth.exchangeCodeForSession({ queryParams, storeSession: true });
    }
  } catch (error) {
    console.warn('Failed to handle auth callback', error);
  }
}

export function AuthBootstrapper() {
  useEffect(() => {
    const sub = Linking.addEventListener('url', ({ url }) => {
      handleUrl(url).catch(() => undefined);
    });

    Linking.getInitialURL().then((initialUrl) => {
      handleUrl(initialUrl).catch(() => undefined);
    });

    if (typeof window !== 'undefined') {
      handleUrl(window.location.href).catch(() => undefined);
    }

    return () => {
      sub.remove();
    };
  }, []);

  return null;
}
