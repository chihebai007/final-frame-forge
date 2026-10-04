import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { json } from "@/lib/public-db.server";

const schema = z.object({
  first_name: z.string().trim().min(1).max(100),
  last_name: z.string().trim().min(1).max(100),
  phone: z.string().trim().regex(/^[+\d\s().-]{8,20}$/, "Téléphone invalide"),
  email: z.union([z.literal(""), z.string().trim().email().max(255)]).optional().default(""),
  wilaya: z.string().trim().min(1).max(100),
  commune: z.string().trim().min(1).max(100),
  address: z.string().trim().min(3).max(500),
  items: z
    .array(z.object({ product_id: z.string().uuid(), quantity: z.number().int().min(1).max(100) }))
    .min(1, "Panier vide")
    .max(50),
});

export const Route = createFileRoute("/api/orders")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let body: unknown;
        try {
          body = await request.json();
        } catch {
          return json({ error: "Requête invalide" }, 400);
        }
        const parsed = schema.safeParse(body);
        if (!parsed.success) return json({ error: parsed.error.issues[0]?.message ?? "Données invalides" }, 400);
        const { items, ...customer } = parsed.data;

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const ids = [...new Set(items.map((i) => i.product_id))];
        const { data: products, error } = await supabaseAdmin
          .from("products")
          .select("id,name,price,stock,active")
          .in("id", ids);
        if (error) return json({ error: "Erreur serveur" }, 500);

        // Merge duplicate lines and check stock using real prices from the database.
        const qty = new Map<string, number>();
        for (const i of items) qty.set(i.product_id, (qty.get(i.product_id) ?? 0) + i.quantity);
        const lines = [];
        let total = 0;
        for (const [id, q] of qty) {
          const p = products.find((x) => x.id === id);
          if (!p || !p.active) return json({ error: "Un produit du panier n’est plus disponible." }, 400);
          if (p.stock < q) return json({ error: `Stock insuffisant pour « ${p.name} » (reste ${p.stock}).` }, 400);
          total += Number(p.price) * q;
          lines.push({ product_id: id, product_name: p.name, quantity: q, unit_price: p.price, stock: p.stock });
        }

        const { data: order, error: oErr } = await supabaseAdmin
          .from("orders")
          .insert({ ...customer, email: customer.email ?? "", total })
          .select("id,order_number")
          .single();
        if (oErr) return json({ error: "Erreur lors de l’enregistrement" }, 500);

        await supabaseAdmin.from("order_items").insert(
          lines.map(({ stock: _s, ...l }) => ({ ...l, order_id: order.id })),
        );
        for (const l of lines) {
          await supabaseAdmin.from("products").update({ stock: l.stock - l.quantity }).eq("id", l.product_id);
        }
        return json({ ok: true, order_number: order.order_number });
      },
    },
  },
});
