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
    const res = await fetch("https://ai.gateway.lovable.dev/v1/responses", {
      method: "POST",
      headers: { "Lovable-API-Key": key, "Content-Type": "application/json", "X-Lovable-AIG-SDK": "fetch" },
      body: JSON.stringify({
        model: "openai/gpt-6-astra",
        stream: true,
        store: false,
        reasoning: { effort: "low" },
        instructions: PROMPT,
        input: JSON.stringify(Object.fromEntries(entries)),
        text: { format: { type: "json_schema", name: "tr", strict: true, schema: { type: "object", additionalProperties: false, required: ["en", "ar"], properties: { en: lang, ar: lang } } } },
      }),
    });
    if (res.status === 429) throw new Error("Trop de demandes de traduction, réessayez dans une minute.");
    if (res.status === 402) throw new Error("Crédits de traduction épuisés.");
    if (!res.ok || !res.body) throw new Error("La traduction a échoué.");
    const reader = res.body.getReader();
    const dec = new TextDecoder();
    let buf = "", text = "";
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      const lines = buf.split("\n");
      buf = lines.pop() ?? "";
      for (const l of lines) {
        if (!l.startsWith("data:")) continue;
        try { const ev = JSON.parse(l.slice(5).trim()); if (ev.type === "response.output_text.delta") text += ev.delta; } catch { /* keep-alive */ }
      }
    }
    let out: { en?: Record<string, string>; ar?: Record<string, string> } = {};
    try { out = JSON.parse(text); } catch { throw new Error("La traduction a échoué."); }
    const pick = (m?: Record<string, string>) => ({ ...empty, ...Object.fromEntries(keys.map((k) => [k, String(m?.[k] ?? "").slice(0, 20_000)])) });
    return { en: pick(out.en), ar: pick(out.ar) };
  });
