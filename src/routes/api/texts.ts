import { createFileRoute } from "@tanstack/react-router";
import { publicDb, json } from "@/lib/public-db.server";

export const Route = createFileRoute("/api/texts")({
  server: {
    handlers: {
      GET: async () => {
        const { data, error } = await publicDb().from("site_texts").select("key,value");
        if (error) {
          console.error(error);
          return json({}, 500);
        }
        return json(Object.fromEntries(data.map((t) => [t.key, t.value])));
      },
    },
  },
});
