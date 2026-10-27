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
            for (const l of ["en", "ar"]) if (typeof tr[l] === "string" && tr[l]) texts[`${t.key}__${l}`] = tr[l] as string;
          }
        } catch (e) {
          console.error(e);
        }
        let html = template.replace(
          /(<(\w+)\b[^>]*\bdata-t="([\w-]+)"[^>]*>)([^<]*)(<\/\2>)/g,
          (m, open: string, _tag, key: string, _txt, close: string) =>
            texts[key] && texts[key].trim() ? open + esc(texts[key]) + close : m,
        );
        const payload = JSON.stringify(texts).replace(/</g, "\\u003c");
        html = html.replace("</head>", `<script>window.__MITINAN_TEXTS__=${payload}</script>\n</head>`);
        return new Response(html, {
          headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" },
        });
      },
    },
  },
});
