import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "MITINAN — Huile d’olive de Kabylie" },
      { name: "description", content: "MITINAN — huile d’olive vierge et extra vierge des montagnes de Kabylie, Bouira, Algérie." },
      { property: "og:title", content: "MITINAN — Huile d’olive de Kabylie" },
      { property: "og:description", content: "Huile d’olive authentique, extraction à froid, 100% naturelle." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  return <iframe src="/site.html" title="MITINAN" className="fixed inset-0 h-full w-full border-0" />;
}
