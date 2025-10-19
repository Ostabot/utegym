
import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const supabaseUrl = Constants.expoConfig?.extra?.supabaseUrl as string;
const supabaseAnon = Constants.expoConfig?.extra?.supabaseAnon as string;

async function secureGet(key: string) {
  if (Platform.OS === 'web') {
    return AsyncStorage.getItem(key);
  }
  try {
    const value = await SecureStore.getItemAsync(key);
    return value ?? (await AsyncStorage.getItem(key));
  } catch (error) {
    console.warn('SecureStore getItem failed, falling back to AsyncStorage', error);
    return AsyncStorage.getItem(key);
  }
}

async function secureSet(key: string, value: string) {
  if (Platform.OS === 'web') {
    await AsyncStorage.setItem(key, value);
    return;
  }
  try {
    await SecureStore.setItemAsync(key, value);
  } catch (error) {
    console.warn('SecureStore setItem failed, falling back to AsyncStorage', error);
  }
  await AsyncStorage.setItem(key, value);
}

async function secureRemove(key: string) {
  if (Platform.OS === 'web') {
    await AsyncStorage.removeItem(key);
    return;
  }
  try {
    await SecureStore.deleteItemAsync(key);
  } catch (error) {
    console.warn('SecureStore removeItem failed', error);
  }
  await AsyncStorage.removeItem(key);
}

const storage = {
  getItem: secureGet,
  setItem: secureSet,
  removeItem: secureRemove,
};

export const supabase = createClient(supabaseUrl, supabaseAnon, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    storage,
    detectSessionInUrl: false,
  },
});
