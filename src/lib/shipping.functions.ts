import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

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
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content:
              "Tu extrais des tarifs de livraison algériens d'un texte de PDF. Pour chaque wilaya de la liste fournie (numéro 1 à 69), donne le prix de livraison à domicile (home) et au bureau / stop desk (desk) en dinars, nombres entiers. Fais correspondre les noms même s'ils sont écrits autrement (arabe, majuscules, numéro). Si une wilaya n'apparaît pas, omets-la. Si un seul prix existe, mets-le dans home et desk=0.",
          },
          { role: "user", content: `Wilayas :\n${list}\n\nTexte du PDF :\n${data.text.slice(0, 120_000)}` },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "save_rates",
              parameters: {
                type: "object",
                properties: {
                  rates: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: { code: { type: "integer" }, home: { type: "number" }, desk: { type: "number" } },
                      required: ["code", "home", "desk"],
                    },
                  },
                },
                required: ["rates"],
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "save_rates" } },
      }),
    });
    if (res.status === 429) throw new Error("Trop de demandes, réessayez dans une minute.");
    if (res.status === 402) throw new Error("Crédits d’analyse épuisés.");
    if (!res.ok) throw new Error("L’analyse du PDF a échoué.");
    const json = await res.json();
    const args = json.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
    const parsed = z
      .object({
        rates: z.array(z.object({ code: z.number().int().min(1).max(69), home: z.number().min(0).max(100000), desk: z.number().min(0).max(100000) })),
      })
      .safeParse(JSON.parse(args ?? "{}"));
    if (!parsed.success) throw new Error("Aucun tarif reconnu dans ce PDF.");
    return parsed.data.rates.map((r) => ({ code: r.code, home: Math.round(r.home), desk: Math.round(r.desk) }));
  });
