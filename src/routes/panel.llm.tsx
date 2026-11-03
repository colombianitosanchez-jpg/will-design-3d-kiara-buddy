import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/panel/llm")({
  ssr: false,
  beforeLoad: () => {
    throw redirect({ to: "/panel/kiara" });
  },
  head: () => ({
    meta: [
      { title: "Kiara IA · Panel Will Design 3D" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: () => null,
});
