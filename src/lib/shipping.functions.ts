import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const PROMPT =
  "Tu extrais des tarifs de livraison algériens d'un texte de PDF. Pour chaque wilaya de la liste (numéro 1 à 69), donne le prix de livraison à domicile (home) et au bureau / stop desk (desk) en dinars, entiers. Fais correspondre les noms même écrits autrement (arabe, majuscules, numéro). Omets les wilayas absentes. Si un seul prix existe, mets-le dans home et desk=0.";

// Reads the text of a carrier's price list (PDF) and returns rates per wilaya. Admin only.
export const parseShippingPdf = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({ text: z.string().min(20).max(200_000), wilayas: z.array(z.string()).length(69) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (isAdmin !== true) throw new Error("Accès refusé");
    const key = process.env["LOVABLE_API_KEY"];
    if (!key) throw new Error("Service d’analyse indisponible");
    const list = data.wilayas.map((w, i) => `${i + 1}. ${w}`).join("\n");
    const res = await fetch("https://ai.gateway.lovable.dev/v1/responses", {
      method: "POST",
      headers: { "Lovable-API-Key": key, "Content-Type": "application/json", "X-Lovable-AIG-SDK": "fetch" },
      body: JSON.stringify({
        model: "openai/gpt-6-astra",
        stream: true,
        store: false,
        reasoning: { effort: "low" },
        instructions: PROMPT,
        input: `Wilayas :\n${list}\n\nTexte du PDF :\n${data.text.slice(0, 120_000)}`,
        text: {
          format: {
            type: "json_schema",
            name: "rates",
            strict: true,
            schema: {
              type: "object",
              additionalProperties: false,
              required: ["rates"],
              properties: {
                rates: {
                  type: "array",
                  items: {
                    type: "object",
                    additionalProperties: false,
                    required: ["code", "home", "desk"],
                    properties: { code: { type: "integer" }, home: { type: "number" }, desk: { type: "number" } },
                  },
                },
              },
            },
          },
        },
      }),
    });
    if (res.status === 429) throw new Error("Trop de demandes, réessayez dans une minute.");
    if (res.status === 402) throw new Error("Crédits d’analyse épuisés.");
    if (!res.ok || !res.body) throw new Error("L’analyse du PDF a échoué.");

    // Collect streamed text deltas (SSE).
    const reader = res.body.getReader();
    const dec = new TextDecoder();
    let buf = "", out = "";
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      const lines = buf.split("\n");
      buf = lines.pop() ?? "";
      for (const l of lines) {
        if (!l.startsWith("data:")) continue;
        try {
          const ev = JSON.parse(l.slice(5).trim());
          if (ev.type === "response.output_text.delta") out += ev.delta;
        } catch { /* ignore keep-alives */ }
      }
    }
    let raw: unknown = {};
    try { raw = JSON.parse(out); } catch { /* handled below */ }
    const parsed = z
      .object({ rates: z.array(z.object({ code: z.number().int().min(1).max(69), home: z.number().min(0).max(100000), desk: z.number().min(0).max(100000) })) })
      .safeParse(raw);
    if (!parsed.success || !parsed.data.rates.length) throw new Error("Aucun tarif reconnu dans ce PDF.");
    return parsed.data.rates.map((r) => ({ code: r.code, home: Math.round(r.home), desk: Math.round(r.desk) }));
  });
