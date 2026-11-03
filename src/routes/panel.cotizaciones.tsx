import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/panel/cotizaciones")({
  ssr: false,
  beforeLoad: () => {
    throw redirect({ to: "/panel/cotizador" });
  },
  head: () => ({
    meta: [
      { title: "Cotizador 3D · Panel Will Design 3D" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: () => null,
});
