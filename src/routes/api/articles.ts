import { createFileRoute } from "@tanstack/react-router";

const articles = [
  { id: 1, title_fr: "La récolte des olives en Kabylie", excerpt_fr: "Découvrez comment nos olives sont récoltées à la main dans les montagnes de Mitinan.", image: "/images/IMG-20260706-WA0062.jpg" },
  { id: 2, title_fr: "L’extraction à froid", excerpt_fr: "Un procédé qui préserve tous les arômes et les bienfaits de l’huile.", image: "/images/IMG-20260706-WA0061.jpg" },
  { id: 3, title_fr: "Notre terroir", excerpt_fr: "Souk El Khamis, Bouira : une terre d’oliviers centenaires.", image: "/images/IMG-20260706-WA0065.jpg" },
];

export const Route = createFileRoute("/api/articles")({
  server: { handlers: { GET: async () => Response.json(articles) } },
});
