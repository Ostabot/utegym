
import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';

const supabaseUrl = Constants.expoConfig?.extra?.supabaseUrl as string;
const supabaseAnon = Constants.expoConfig?.extra?.supabaseAnon as string;

// SecureStore-based storage for native
const storage = {
  getItem: (key: string) => SecureStore.getItemAsync(key),
  setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value),
  removeItem: (key: string) => SecureStore.deleteItemAsync(key),
};

export const supabase = createClient(supabaseUrl, supabaseAnon, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    storage,
    detectSessionInUrl: false, // Expo uses deep link listener instead
  },
});
