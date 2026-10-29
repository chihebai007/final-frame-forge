import { createFileRoute } from "@tanstack/react-router";
import template from "../site-template.html?raw";
import { publicDb } from "@/lib/public-db.server";

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// Serves the public site with the latest saved texts already in the HTML,
// so a refresh never flashes old copy.
export const Route = createFileRoute("/site.html")({
  server: {
    handlers: {
      GET: async () => {
        const texts: Record<string, string> = {};
        try {
          const { data } = await publicDb().from("site_texts").select("key,value,translations");
          for (const t of data ?? []) {
            texts[t.key] = t.value;
            const tr = (t.translations ?? {}) as Record<string, unknown>;
            for (const l of ["en", "ar"]) {
              const translation = tr[l];
              if (typeof translation === "string" && translation) texts[`${t.key}__${l}`] = translation;
            }
          }
        } catch (e) {
          console.error(e);
        }
        let html = template.replace(
          /(<(\w+)\b[^>]*\bdata-t="([\w-]+)"[^>]*>)([^<]*)(<\/\2>)/g,
          (m: string, open: string, _tag: string, key: string, _txt: string, close: string) => {
            const text = texts[key];
            return text && text.trim() ? open + esc(text) + close : m;
          },
        );
        const db = publicDb();
        const data: Record<string, unknown> = {};
        try {
          const [p, r, a, w] = await Promise.all([
            db.from("products").select("id,name,name_ar,name_en,description,description_ar,description_en,price,sale_price,stock,size,category,image_url,packs_enabled,quantity_offers").eq("active", true).order("sort_order").order("created_at"),
            db.from("reviews").select("id,product_id,name,rating,comment,created_at").eq("approved", true).order("created_at", { ascending: false }).limit(500),
            db.from("articles").select("id,title,excerpt,image_url,translations").eq("published", true).order("created_at", { ascending: false }),
            db.from("awards").select("id,title,year,description,image_url,translations").eq("published", true).order("sort_order").order("created_at", { ascending: false }),
          ]);
          if (!p.error) data["products"] = p.data;
          if (!r.error) data["reviews"] = r.data;
          if (!a.error) data["articles"] = a.data;
          if (!w.error) data["awards"] = w.data;
        } catch (e) {
          console.error(e);
        }
        const safe = (v: unknown) => JSON.stringify(v).replace(/</g, "\\u003c");
        html = html.replace(
          "</head>",
          `<script>window.__MITINAN_TEXTS__=${safe(texts)};window.__MITINAN_DATA__=${safe(data)}</script>\n</head>`,
        );
        return new Response(html, {
          headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" },
        });
      },
    },
  },
});
