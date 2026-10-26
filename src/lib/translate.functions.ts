import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const PROMPT =
  "Tu traduis les textes d'une boutique d'huile d'olive algérienne (MITINAN, Kabylie) du français vers l'anglais (en) et l'arabe standard (ar). Garde le même ton commercial, les noms propres (MITINAN, Kabylie, Bouira), les numéros, emails, emojis, flèches et la ponctuation. Pour l'arabe, remplace la flèche → par ←. Renvoie exactement les mêmes clés.";

// Translates French fields to English and Arabic. Shop staff only.
export const translateFields = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ texts: z.record(z.string().max(60), z.string().max(20_000)) }).parse(d))
  .handler(async ({ data, context }) => {
    const roles = await Promise.all(["admin", "manager"].map((r) => context.supabase.rpc("has_role", { _user_id: context.userId, _role: r as "admin" })));
    if (!roles.some((r) => r.data === true)) throw new Error("Accès refusé");
    const entries = Object.entries(data.texts).filter(([, v]) => v.trim());
    const empty = Object.fromEntries(Object.keys(data.texts).map((k) => [k, ""]));
    if (!entries.length) return { en: empty, ar: empty };
    const key = process.env["LOVABLE_API_KEY"];
    if (!key) throw new Error("Traduction indisponible");
    const keys = entries.map(([k]) => k);
    const lang = { type: "object", additionalProperties: false, required: keys, properties: Object.fromEntries(keys.map((k) => [k, { type: "string" }])) };
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Lovable-API-Key": key, "Content-Type": "application/json", "X-Lovable-AIG-SDK": "fetch" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [{ role: "system", content: PROMPT }, { role: "user", content: JSON.stringify(Object.fromEntries(entries)) }],
        response_format: { type: "json_schema", json_schema: { name: "tr", strict: true, schema: { type: "object", additionalProperties: false, required: ["en", "ar"], properties: { en: lang, ar: lang } } } },
      }),
    });
    if (res.status === 429) throw new Error("Trop de demandes de traduction, réessayez dans une minute.");
    if (res.status === 402) throw new Error("Crédits de traduction épuisés.");
    if (!res.ok) throw new Error("La traduction a échoué.");
    const body = await res.json();
    let out: { en?: Record<string, string>; ar?: Record<string, string> } = {};
    try { out = JSON.parse(body.choices?.[0]?.message?.content ?? "{}"); } catch { throw new Error("La traduction a échoué."); }
    const pick = (m?: Record<string, string>) => ({ ...empty, ...Object.fromEntries(keys.map((k) => [k, String(m?.[k] ?? "").slice(0, 20_000)])) });
    return { en: pick(out.en), ar: pick(out.ar) };
  });
