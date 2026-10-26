import { createFileRoute } from "@tanstack/react-router";
import { publicDb, json } from "@/lib/public-db.server";

export const Route = createFileRoute("/api/texts")({
  server: {
    handlers: {
      GET: async () => {
        const { data, error } = await publicDb().from("site_texts").select("key,value,translations");
        if (error) {
          console.error(error);
          return json({}, 500);
        }
        const out: Record<string, string> = {};
        for (const t of data) {
          out[t.key] = t.value;
          const tr = (t.translations ?? {}) as Record<string, unknown>;
          for (const l of ["en", "ar"]) if (typeof tr[l] === "string" && tr[l]) out[`${t.key}__${l}`] = tr[l] as string;
        }
        return json(out);
      },
    },
  },
});
