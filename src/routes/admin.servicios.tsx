import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/admin/servicios")({
  beforeLoad: ({ location }) => {
    throw redirect({
      to: "/panel/servicios" as any,
      search: location.search as any,
      replace: true,
    });
  },
});
