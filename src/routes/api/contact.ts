import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { json } from "@/lib/public-db.server";

const schema = z.object({
  name: z.string().trim().min(1).max(100),
  email: z.string().trim().email().max(255),
  message: z.string().trim().min(1).max(2000),
});

export const Route = createFileRoute("/api/contact")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const parsed = schema.safeParse(await request.json().catch(() => null));
        if (!parsed.success) return json({ error: "Merci de remplir correctement le formulaire." }, 400);
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { error } = await supabaseAdmin.from("contact_messages").insert(parsed.data);
        if (error) return json({ error: "Erreur serveur" }, 500);
        return json({ ok: true });
      },
    },
  },
});
