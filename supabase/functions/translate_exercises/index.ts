// supabase/functions/translate_exercises/index.ts
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.1";

// Hämta secrets från Edge Secrets
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const OPENAI_KEY =
  Deno.env.get("OPENAI_APP_KEY") ?? Deno.env.get("OPENAI_API_KEY");

if (!OPENAI_KEY) {
  console.error("Missing OPENAI_APP_KEY or OPENAI_API_KEY");
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function translateSvToEn(text: string): Promise<string> {
  const body = {
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content:
          "You translate Swedish exercise instructions to concise, clear English. " +
          "Keep the style as short imperative instructions. Do not add bullet points or extra markup.",
      },
      {
        role: "user",
        content:
          `Translate this Swedish exercise description to English:\n\n` + text,
      },
    ],
    temperature: 0.2,
  };

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENAI_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const msg = await res.text();
    throw new Error(`OpenAI error: ${res.status} – ${msg}`);
  }

  const json = await res.json();
  const content: string =
    json.choices?.[0]?.message?.content?.trim?.() ?? "";
  return content;
}

serve(async (req) => {
  // Enkel “batch-size” via query param: /?limit=20
  const url = new URL(req.url);
  const limit = Number(url.searchParams.get("limit") ?? "25");

  try {
    // 1) Hämta ett gäng rader som saknar engelsk description
    const { data, error } = await supabase
      .from("outdoor_exercises")
      .select("key, description_sv, description_en")
      .is("description_en", null)
      .not("description_sv", "is", null)
      .limit(limit);

    if (error) throw error;

    if (!data || data.length === 0) {
      return new Response(
        JSON.stringify({ done: true, translated: 0 }),
        { headers: { "Content-Type": "application/json" } },
      );
    }

    const updates: { key: string; description: string }[] = [];

    for (const row of data) {
      const sv: string | null = row.description_sv;
      if (!sv) continue;

      console.log("Translating", row.key);
      const en = await translateSvToEn(sv);
      updates.push({ key: row.key, description: en });
    }

    // 2) Uppdatera raderna i bulk
    // (Supabase har ingen “multi-update-by-pk” i ett anrop, så vi gör en enkel loop.)
    for (const u of updates) {
      const { error: upErr } = await supabase
        .from("outdoor_exercises")
        .update({ description_en: u.description })
        .eq("key", u.key);
      if (upErr) {
        console.error("Update failed for", u.key, upErr);
      }
    }

    return new Response(
      JSON.stringify({
        done: false,
        translated: updates.length,
        batchSize: data.length,
      }),
      { headers: { "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("translate_exercises failed", err);
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
});