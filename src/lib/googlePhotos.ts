// lib/googlePhotos.ts
import { supabase } from "@/lib/supabase";

const EDGE_URL = `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/places-photo`;

export async function ensureGooglePhotoUrl(nameOrPlaceId: string, maxWidth = 1200) {
    if (!nameOrPlaceId.startsWith("places/")) {
        const { data } = supabase.storage.from("google-photos-cache").getPublicUrl(nameOrPlaceId);
        return data?.publicUrl ?? null;
    }
    const placeId = nameOrPlaceId.split("/")[1];
    const res = await fetch(EDGE_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ placeId, maxWidth }),
    });
    if (!res.ok) return null;
    const json = await res.json().catch(() => ({}));
    return json?.url ?? null;
}