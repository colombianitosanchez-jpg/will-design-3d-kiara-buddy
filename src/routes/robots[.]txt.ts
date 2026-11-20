import { createFileRoute } from "@tanstack/react-router";
import { buildRobotsTxt } from "@/lib/seo";
import { fetchSiteContentMapServer } from "@/lib/seo.server";

export const Route = createFileRoute("/robots.txt")({
  server: {
    handlers: {
      GET: async () => {
        const siteContent = await fetchSiteContentMapServer([
          "site_indexable_global",
          "site_canonical_domain",
          "site_url",
        ]);
        const body = buildRobotsTxt(siteContent);

        return new Response(body, {
          headers: {
            "Content-Type": "text/plain; charset=utf-8",
            "Cache-Control": "public, max-age=1800",
          },
        });
      },
    },
  },
});
