import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/orders")({
  server: {
    handlers: {
      POST: async () => Response.json({ ok: true, order_id: Math.floor(Math.random() * 9000) + 1000 }),
    },
  },
});
