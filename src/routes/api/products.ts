import { createFileRoute } from "@tanstack/react-router";

const products = [
  { id: 1, name_fr: "Huile d’olive Extra Vierge MITINAN", description_fr: "Huile d’olive extra vierge issue du terroir de Kabylie.", price: 1800, stock: 50, size: "1 L", category: "extra-vierge", image: "/images/IMG-20260706-WA0064.jpg" },
  { id: 2, name_fr: "Huile d’olive Vierge MITINAN", description_fr: "Une huile authentique, naturelle et enracinée dans la tradition.", price: 1500, stock: 50, size: "1 L", category: "vierge", image: "/images/IMG-20260706-WA0063.jpg" },
];

export const Route = createFileRoute("/api/products")({
  server: { handlers: { GET: async () => Response.json(products) } },
});
