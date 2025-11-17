import { MMKV } from 'react-native-mmkv';
export const storage = new MMKV();
export const setJSON = (k: string, v: unknown) => storage.set(k, JSON.stringify(v));
export const getJSON = <T=any>(k: string): T | null => {
  const raw = storage.getString(k);
  return raw ? JSON.parse(raw) as T : null;
};
export const del = (k: string) => storage.delete(k);
export const keys = () => storage.getAllKeys();