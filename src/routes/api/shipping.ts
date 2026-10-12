import { createFileRoute } from "@tanstack/react-router";
import { publicDb, json } from "@/lib/public-db.server";

export const Route = createFileRoute("/api/shipping")({
  server: {
    handlers: {
      GET: async () => {
        const { data, error } = await publicDb()
          .from("shipping_rates")
          .select("wilaya_code,home_price,desk_price,available")
          .order("wilaya_code");
        if (error) {
          console.error(error);
          return json([], 500);
        }
        return json(data);
      },
    },
  },
});
