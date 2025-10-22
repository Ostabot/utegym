// src/lib/supabase.ts
import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';

const fromEnv = {
    supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
    supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
};

// Fallback till app.config extra (dev) eller manifestExtra (EAS build)
const fromConstants =
    (Constants.expoConfig?.extra as any) ??
    (Constants as any)?.manifestExtra ??
    {};

const supabaseUrl =
    (fromEnv.supabaseUrl as string | undefined) ??
    (fromConstants.supabaseUrl as string | undefined);

const supabaseAnon =
    (fromEnv.supabaseAnonKey as string | undefined) ??
    (fromConstants.supabaseAnonKey as string | undefined);

if (!supabaseUrl || !supabaseAnon) {
    console.warn('Supabase env saknas. Kolla .env och app.config.ts', {
        envUrl: !!fromEnv.supabaseUrl,
        envAnon: !!fromEnv.supabaseAnonKey,
        constants: fromConstants,
    });
}

const storage = {
    getItem: async (k: string) => (await SecureStore.getItemAsync(k)) ?? AsyncStorage.getItem(k),
    setItem: async (k: string, v: string) => {
        try { await SecureStore.setItemAsync(k, v); } catch { await AsyncStorage.setItem(k, v); }
    },
    removeItem: async (k: string) => {
        try { await SecureStore.deleteItemAsync(k); } catch { await AsyncStorage.removeItem(k); }
    },
};

export const supabase = createClient(supabaseUrl ?? '', supabaseAnon ?? '', {
    auth: { autoRefreshToken: true, persistSession: true, storage, detectSessionInUrl: false },
});