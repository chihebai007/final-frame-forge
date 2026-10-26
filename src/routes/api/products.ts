import { createFileRoute } from "@tanstack/react-router";
import { publicDb, json } from "@/lib/public-db.server";

export const Route = createFileRoute("/api/products")({
  server: {
    handlers: {
      GET: async () => {
        const { data, error } = await publicDb()
          .from("products")
           .select("id,name,name_ar,name_en,description,description_ar,description_en,price,sale_price,stock,size,category,image_url,packs_enabled,quantity_offers")
          .eq("active", true)
          .order("sort_order")
          .order("created_at");
        if (error) {
          console.error(error);
          return json([], 500);
        }
        return json(data);
      },
    },
  },
});
