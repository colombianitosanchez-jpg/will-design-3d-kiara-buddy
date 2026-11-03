import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/panel/conocimiento")({
  ssr: false,
  beforeLoad: () => {
    throw redirect({ to: "/panel/kiara" });
  },
  head: () => ({
    meta: [
      { title: "Base de Conocimiento · Panel Will Design 3D" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: () => null,
});
