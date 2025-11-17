// supabase/functions/places-photo/index.ts
// Supabase Edge Function (Deno)
import { serve } from "https://deno.land/std@0.223.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const GOOGLE_KEY = Deno.env.get("GOOGLE_MAPS_API_KEY")!;
const BUCKET = "google-photos-cache";

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

type ReqBody = {
    placeId?: string;
    maxWidth?: number;
};

function corsHeaders() {
    return {
        "access-control-allow-origin": "*",
        "access-control-allow-methods": "POST,OPTIONS",
        "access-control-allow-headers": "authorization, x-client-info, apikey, content-type",
        "content-type": "application/json",
        "cache-control": "max-age=3600",
    };
}

async function ensureBucket() {
    // Skapa bucket om den inte finns (kräver service role)
    const { data: list, error: listErr } = await supabase.storage.listBuckets();
    if (listErr) return; // mjukt fel
    const exists = (list ?? []).some((b) => b.id === BUCKET);
    if (!exists) {
        await supabase.storage.createBucket(BUCKET, { public: true });
    }
}

async function getPhotoReference(placeId: string): Promise<string | null> {
    const u = new URL("https://maps.googleapis.com/maps/api/place/details/json");
    u.searchParams.set("place_id", placeId);
    u.searchParams.set("fields", "photos");
    u.searchParams.set("key", GOOGLE_KEY);

    const res = await fetch(u, { redirect: "follow" });
    if (!res.ok) return null;
    const json = await res.json();
    const ref = json?.result?.photos?.[0]?.photo_reference as string | undefined;
    return ref ?? null;
}

function extFromContentType(ct: string) {
    if (ct.includes("image/webp")) return "webp";
    if (ct.includes("image/png")) return "png";
    return "jpg"; // default
}

async function fetchPhotoBlob(photoRef: string, maxWidth = 1200) {
    const u = new URL("https://maps.googleapis.com/maps/api/place/photo");
    u.searchParams.set("maxwidth", String(maxWidth));
    u.searchParams.set("photo_reference", photoRef);
    u.searchParams.set("key", GOOGLE_KEY);

    const res = await fetch(u, { redirect: "follow" });
    if (!res.ok) throw new Error(`Google photo fetch failed: ${res.status}`);
    const contentType = res.headers.get("content-type") || "image/jpeg";
    const buf = new Uint8Array(await res.arrayBuffer());
    return { buf, contentType };
}

serve(async (req) => {
    // CORS preflight
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders() });
    }

    try {
        if (req.method !== "POST") {
            return new Response(JSON.stringify({ error: "Method Not Allowed" }), {
                status: 405,
                headers: corsHeaders(),
            });
        }

        const { placeId, maxWidth }: ReqBody = await req.json().catch(() => ({}));
        if (!placeId) {
            return new Response(JSON.stringify({ error: "placeId required" }), {
                status: 400,
                headers: corsHeaders(),
            });
        }

        await ensureBucket();

        const width = Math.max(200, Math.min(maxWidth ?? 1200, 1600));

        // Hämta photo_reference
        const ref = await getPhotoReference(placeId);
        if (!ref) {
            return new Response(JSON.stringify({ url: null }), {
                status: 200,
                headers: corsHeaders(),
            });
        }

        // Hämta bild
        const { buf, contentType } = await fetchPhotoBlob(ref, width);
        const ext = extFromContentType(contentType);

        // Slå in ett filnamn
        const path = `${placeId}_${width}.${ext}`;

        // Spara i Storage (upsert för enkelhet)
        const up = await supabase.storage.from(BUCKET).upload(path, buf, {
            contentType,
            upsert: true,
        });
        if (up.error) throw up.error;

        // Publik URL
        const pub = supabase.storage.from(BUCKET).getPublicUrl(path);
        const url = pub.data.publicUrl;

        return new Response(JSON.stringify({ url }), {
            status: 200,
            headers: corsHeaders(),
        });
    } catch (e: any) {
        console.error(e);
        return new Response(JSON.stringify({ error: String(e?.message ?? e) }), {
            status: 500,
            headers: corsHeaders(),
        });
    }
});