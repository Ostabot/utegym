// supabase/functions/places-photo/index.ts
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const GOOGLE_KEY = Deno.env.get("GOOGLE_MAPS_API_KEY")!; // <- använd denna
const BUCKET = "google-photos-cache";

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

const CORS = {
    "access-control-allow-origin": "*",
    "access-control-allow-methods": "GET,POST,OPTIONS",
    "access-control-allow-headers": "authorization, x-client-info, apikey, content-type",
    "content-type": "application/json",
    "cache-control": "public, max-age=3600",
};

function extFromContentType(ct: string) {
    if (ct.includes("image/webp")) return "webp";
    if (ct.includes("image/png")) return "png";
    return "jpg";
}

function normalizePath(name: string, width: number, ext = "jpg") {
    // stabil och läsbar lagrings-nyckel
    return `${name.replace(/^\/+/, "")}_${width}.${ext}`;
}

async function headPublic(url: string) {
    const r = await fetch(url, { method: "HEAD" }).catch(() => null);
    return !!r?.ok;
}

async function fetchViaV1Name(name: string, width: number) {
    const url = `https://places.googleapis.com/v1/${encodeURI(name)}/media?maxWidthPx=${width}&key=${GOOGLE_KEY}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Google media fetch failed: ${res.status}`);
    const buf = new Uint8Array(await res.arrayBuffer());
    const ct = res.headers.get("content-type") || "image/jpeg";
    return { buf, contentType: ct };
}

// Fallback: om vi bara får placeId, hämta första fotots v1-name via Details
async function getFirstPhotoNameFromPlaceId(placeId: string): Promise<string | null> {
    const u = new URL("https://places.googleapis.com/v1/places/" + encodeURIComponent(placeId));
    u.searchParams.set("fields", "photos");
    u.searchParams.set("key", GOOGLE_KEY);
    const r = await fetch(u.toString());
    if (!r.ok) return null;
    const j = await r.json();
    const name = j?.photos?.[0]?.name as string | undefined; // "places/.../photos/..."
    return name ?? null;
}

serve(async (req) => {
    if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

    try {
        const url = new URL(req.url);
        const isPost = req.method === "POST";
        const body = isPost ? await req.json().catch(() => ({})) : {};
        const name = (url.searchParams.get("name") ?? body.name ?? "").trim();   // v1-resurs
        const placeId = (url.searchParams.get("placeId") ?? body.placeId ?? "").trim(); // fallback
        const wRaw = url.searchParams.get("w") ?? body.maxWidth;
        const width = Math.min(Math.max(Number(wRaw || 1600), 200), 2048);

        if (!name && !placeId) {
            return new Response(JSON.stringify({ error: "Provide ?name=<places/.../photos/...> or placeId" }), {
                status: 400,
                headers: CORS,
            });
        }

        // Resolve v1 'name'
        const v1Name = name || (await getFirstPhotoNameFromPlaceId(placeId));
        if (!v1Name) {
            return new Response(JSON.stringify({ url: null }), { status: 200, headers: CORS });
        }

        // 1) Finns redan i public Storage?
        const objectPath = normalizePath(v1Name, width); // places/.../photos/..._1600.jpg
        const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${objectPath}`;
        if (await headPublic(publicUrl)) {
            return new Response(JSON.stringify({ url: publicUrl }), { status: 200, headers: CORS });
        }

        // 2) Hämta från Google v1 media
        const { buf, contentType } = await fetchViaV1Name(v1Name, width);
        const ext = extFromContentType(contentType);

        // 3) Ladda upp till Storage (upsert)
        const upload = await fetch(`${SUPABASE_URL}/storage/v1/object/${BUCKET}/${objectPath}`, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
                "Content-Type": contentType,
                "x-upsert": "true",
                "Cache-Control": "public, max-age=31536000, immutable",
            },
            body: buf,
        });
        if (!upload.ok) {
            const t = await upload.text();
            throw new Error(`Upload failed: ${upload.status} ${t}`);
        }

        return new Response(JSON.stringify({ url: publicUrl }), { status: 200, headers: CORS });
    } catch (e: any) {
        return new Response(JSON.stringify({ error: String(e?.message ?? e) }), { status: 500, headers: CORS });
    }
});