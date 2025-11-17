// supabase/functions/generate-exercise-descriptions/index.ts
// Edge Function (Deno) — fill outdoor_exercises.description_sv via OpenAI

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

type Exercise = {
    key: string;
    name: string;
    name_sv: string | null;
    focus: string | null;
    difficulty: "easy" | "medium" | "hard" | null;
    description_sv: string | null;
};

type Body = {
    ping?: boolean;
    limit?: number;   // how many rows to process this run (1..200)
    dryRun?: boolean; // don't write to DB
    force?: boolean;  // overwrite even if description_sv already exists
    keys?: string[];  // restrict to specific exercise keys
};

// --- helpers -------------------------------------------------------------

function delay(ms: number) {
    return new Promise((res) => setTimeout(res, ms));
}

function capitalize(s?: string | null) {
    if (!s) return s ?? "";
    return s.charAt(0).toUpperCase() + s.slice(1);
}

async function callOpenAI(apiKey: string, prompt: string): Promise<string> {
    const ctl = new AbortController();
    const timeout = setTimeout(() => ctl.abort(), 45_000); // 45s hard cap

    try {
        const res = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
                "authorization": `Bearer ${apiKey}`,
                "content-type": "application/json",
            },
            body: JSON.stringify({
                model: "gpt-4o-mini",
                temperature: 0.3,
                messages: [
                    { role: "system", content: "Du skriver korta, precisa träningsinstruktioner på svenska." },
                    { role: "user", content: prompt },
                ],
            }),
            signal: ctl.signal,
        });

        if (!res.ok) {
            const txt = await res.text();
            console.error("OpenAI non-200:", res.status, txt);
            throw new Error(`OpenAI ${res.status}`);
        }

        const data = await res.json();
        const text = data?.choices?.[0]?.message?.content?.trim();
        if (!text) throw new Error("Tomt svar från modellen");
        return text;
    } finally {
        clearTimeout(timeout);
    }
}

// --- function entry ------------------------------------------------------

Deno.serve(async (req) => {
    const url = new URL(req.url);

    // Try read body (without crashing if none)
    let body: Body = {};
    try { body = await req.clone().json(); } catch { /* no body is fine */ }

    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY") ?? "";
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    // Health check: /?ping=1 OR { "ping": true }
    if (url.searchParams.get("ping") === "1" || body.ping) {
        // quick OpenAI connectivity smoke test (doesn't consume much)
        let openaiOk = false;
        if (OPENAI_API_KEY) {
            try {
                const r = await fetch("https://api.openai.com/v1/models", {
                    headers: { authorization: `Bearer ${OPENAI_API_KEY}` },
                });
                openaiOk = r.ok;
            } catch (e) {
                console.error("OpenAI connectivity test failed:", e);
            }
        }
        return new Response(
            JSON.stringify({
                ok: true,
                env: {
                    hasOpenAIKey: !!OPENAI_API_KEY,
                    hasServiceRole: !!SUPABASE_SERVICE_ROLE_KEY,
                    hasUrl: !!SUPABASE_URL,
                },
                openaiOk,
                now: new Date().toISOString(),
            }),
            { headers: { "content-type": "application/json" } },
        );
    }

    if (!OPENAI_API_KEY) {
        console.error("Missing OPENAI_API_KEY");
        return new Response(JSON.stringify({ ok: false, error: "Missing OPENAI_API_KEY" }), { status: 500 });
    }
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
        console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
        return new Response(JSON.stringify({ ok: false, error: "Missing Supabase env vars" }), { status: 500 });
    }

    const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
        auth: { persistSession: false },
    });

    // parse inputs
    const limit = Math.min(Math.max(body.limit ?? 50, 1), 200);
    const dryRun = Boolean(body.dryRun);
    const force = Boolean(body.force);
    const keys = Array.isArray(body.keys) && body.keys.length ? body.keys : undefined;

    console.log("Batch start", { limit, dryRun, force, keysCount: keys?.length ?? 0 });
    console.time("batch");

    try {
        // 1) select candidates
        let q = sb.from("outdoor_exercises")
            .select("key,name,name_sv,focus,difficulty,description_sv")
            .limit(limit);

        if (keys) q = q.in("key", keys);
        else if (!force) q = q.is("description_sv", null);

        const { data: rows, error: readErr } = await q;
        if (readErr) throw readErr;

        const toProcess = (rows ?? []) as Exercise[];
        const results: Array<{ key: string; generated?: string; skipped?: boolean; error?: string }> = [];

        // 2) generate and (optionally) write
        for (const ex of toProcess) {
            if (ex.description_sv && !force) {
                results.push({ key: ex.key, skipped: true });
                continue;
            }

            const displayName = capitalize(ex.name_sv) || capitalize(ex.name);
            const prompt =
                `Skriv en kort, tydlig svensk övningsbeskrivning (2–4 meningar) för "${displayName}". ` +
                `Fokus: ${ex.focus ?? "okänt"}. Svårighetsgrad: ${ex.difficulty ?? "okänd"}. ` +
                `Beskriv utförande, hållning och ett vanligt misstag att undvika. Ingen rubrik, inga emojis eller punktlistor.`;

            let generated: string;
            try {
                generated = await callOpenAI(OPENAI_API_KEY, prompt);
            } catch (e: any) {
                results.push({ key: ex.key, error: e?.message ?? String(e) });
                // small wait to be nice with rate limits
                await delay(300);
                continue;
            }

            if (!dryRun) {
                const { error: upErr } = await sb
                    .from("outdoor_exercises")
                    .update({ description_sv: generated })
                    .eq("key", ex.key);
                if (upErr) {
                    results.push({ key: ex.key, error: upErr.message });
                    await delay(300);
                    continue;
                }
            }

            results.push({ key: ex.key, generated });
            await delay(300);
        }

        console.timeEnd("batch");
        return new Response(JSON.stringify({ ok: true, dryRun, processed: results.length, results }, null, 2), {
            headers: { "content-type": "application/json" },
        });
    } catch (e: any) {
        console.timeEnd("batch");
        console.error("Unhandled error:", e);
        return new Response(JSON.stringify({ ok: false, error: e?.message ?? String(e) }), {
            status: 500,
            headers: { "content-type": "application/json" },
        });
    }
});