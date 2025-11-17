// lib/mapAttributions.ts
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'map.lastAttributions';

export type MapAttributionSource = {
  name: string;
  url?: string | null;
};

export async function saveLastMapAttributions(sources: MapAttributionSource[]) {
  try { await AsyncStorage.setItem(KEY, JSON.stringify({ at: Date.now(), sources })); } catch {}
}

export async function loadLastMapAttributions(): Promise<{ at?: number; sources: MapAttributionSource[] }> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return { sources: [] };
    return JSON.parse(raw);
  } catch { return { sources: [] }; }
}