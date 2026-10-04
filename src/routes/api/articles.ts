import { createFileRoute } from "@tanstack/react-router";
import { publicDb, json } from "@/lib/public-db.server";

export const Route = createFileRoute("/api/articles")({
  server: {
    handlers: {
      GET: async () => {
        const { data, error } = await publicDb()
          .from("articles")
          .select("id,title,excerpt,image_url")
          .eq("published", true)
          .order("created_at", { ascending: false });
        if (error) {
          console.error(error);
          return json([], 500);
        }
        return json(data);
      },
    },
  },
});
