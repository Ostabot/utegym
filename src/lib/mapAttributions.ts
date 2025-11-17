// src/lib/mapAttributions.ts
import AsyncStorage from '@react-native-async-storage/async-storage';

export type MapAttributionSource = {
    name: string;
    href?: string | null;
    copyright?: string | null;
};

const STORAGE_KEY = 'utegym.last-map-attributions';

export async function saveLastMapAttributions(sources: MapAttributionSource[]) {
    try {
        const payload = JSON.stringify({ at: Date.now(), sources });
        await AsyncStorage.setItem(STORAGE_KEY, payload);
    } catch { }
}

export async function loadLastMapAttributions(): Promise<{
    at: number | null;
    sources: MapAttributionSource[];
}> {
    try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (!raw) return { at: null, sources: [] };
        const parsed = JSON.parse(raw);
        return {
            at: Number(parsed?.at) || null,
            sources: Array.isArray(parsed?.sources) ? parsed.sources : [],
        };
    } catch {
        return { at: null, sources: [] };
    }
}

/** Fallback if we have nothing recorded yet */
export const defaultMapAttributions: MapAttributionSource[] = [
    { name: 'Mapbox', href: 'https://www.mapbox.com/legal/attribution/' },
    { name: 'OpenStreetMap contributors', href: 'https://www.openstreetmap.org/copyright' },
];