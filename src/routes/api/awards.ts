import { createFileRoute } from "@tanstack/react-router";
import { publicDb, json } from "@/lib/public-db.server";

export const Route = createFileRoute("/api/awards")({
  server: {
    handlers: {
      GET: async () => {
        const { data, error } = await publicDb()
          .from("awards")
          .select("id,title,year,description,image_url,translations")
          .eq("published", true)
          .order("sort_order")
          .order("created_at", { ascending: false });
        if (error) return json([], 500);
        return json(data);
      },
    },
  },
});
