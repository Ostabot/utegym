// src/lib/storage.ts
import AsyncStorage from '@react-native-async-storage/async-storage';

const mem = new Map<string, string>();

export function setJSON(key: string, value: unknown) {
    const s = JSON.stringify(value);
    // synk handoff (inom samma JS runtime)
    mem.set(key, s);
    // persist i bakgrunden
    AsyncStorage.setItem(key, s).catch(() => { });
}

export function getJSONSync<T = any>(key: string): T | null {
    const s = mem.get(key);
    return s ? (JSON.parse(s) as T) : null;
}

export async function getJSON<T = any>(key: string): Promise<T | null> {
    const fromMem = getJSONSync<T>(key);
    if (fromMem) return fromMem;
    const raw = await AsyncStorage.getItem(key);
    if (raw == null) return null;
    mem.set(key, raw);
    return JSON.parse(raw) as T;
}

export function del(key: string) {
    mem.delete(key);
    AsyncStorage.removeItem(key).catch(() => { });
}

export async function keys(prefix?: string): Promise<string[]> {
    const memKeys = Array.from(mem.keys());
    const persisted = await AsyncStorage.getAllKeys();
    const merged = Array.from(new Set([...memKeys, ...persisted]));
    return prefix ? merged.filter((k) => k.startsWith(prefix)) : merged;
}