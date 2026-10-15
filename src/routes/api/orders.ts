import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { json } from "@/lib/public-db.server";

const schema = z
  .object({
    destination: z.enum(["algerie", "international"]).default("algerie"),
    country: z.string().trim().max(100).optional().default(""),
    first_name: z.string().trim().min(1).max(100),
    last_name: z.string().trim().min(1).max(100),
    phone: z.string().trim().regex(/^[+\d\s().-]{8,20}$/, "Téléphone invalide"),
    email: z.string().trim().email("Email invalide").max(255),
    wilaya: z.string().trim().max(100).optional().default(""),
    commune: z.string().trim().max(100).optional().default(""),
    address: z.string().trim().min(3).max(500),
    delivery_type: z.enum(["domicile", "bureau"]).default("domicile"),
    website: z.string().optional(),
    acquisition_source: z.string().trim().max(100).optional().default('Non renseignée'),
    items: z
      .array(z.object({ product_id: z.string().uuid(), quantity: z.number().int().min(1).max(100) }))
      .min(1, "Panier vide")
      .max(50),
  })
  .superRefine((v, ctx) => {
    if (v.destination === "algerie") {
      if (!v.wilaya) ctx.addIssue({ code: "custom", message: "Choisissez votre wilaya" });
      if (!v.commune) ctx.addIssue({ code: "custom", message: "Indiquez votre commune" });
    } else if (!v.country) ctx.addIssue({ code: "custom", message: "Indiquez votre pays" });
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
        const { items, website, ...customer } = parsed.data;
        if (website) return json({ ok: true, order_number: 0 }); // robot (honeypot)
        if (customer.destination === "international") {
          customer.wilaya = customer.wilaya || "International";
          customer.commune = customer.commune || customer.country;
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const ids = [...new Set(items.map((i) => i.product_id))];
        const { data: products, error } = await supabaseAdmin
          .from("products")
          .select("id,name,price,sale_price,stock,active")
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
          const sale = Number(p.sale_price);
          const unit = sale > 0 && sale < Number(p.price) ? sale : Number(p.price);
          total += unit * q;
          lines.push({ product_id: id, product_name: p.name, quantity: q, unit_price: unit, stock: p.stock });
        }

        // Delivery fee from the admin-managed rate table (wilaya value starts with its code, e.g. "10 - Bouira").
        let shipping_fee = 0;
        if (customer.destination === "algerie") {
          const code = parseInt(customer.wilaya, 10);
          const { data: rate } = await supabaseAdmin.from("shipping_rates").select("*").eq("wilaya_code", code).maybeSingle();
          if (!rate) return json({ error: "Choisissez votre wilaya" }, 400);
          if (!rate.available) return json({ error: "Livraison indisponible dans cette wilaya." }, 400);
          shipping_fee = Number(customer.delivery_type === "bureau" ? rate.desk_price : rate.home_price);
          if (customer.delivery_type === "bureau" && !shipping_fee) shipping_fee = Number(rate.home_price);
          total += shipping_fee;
        }

        const { data: order, error: oErr } = await supabaseAdmin
          .from("orders")
          .insert({ ...customer, shipping_fee, total })
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
