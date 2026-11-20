import { createFileRoute } from "@tanstack/react-router";
import { buildLlmsTxt } from "@/lib/seo";
import {
  fetchActiveProductsServer,
  fetchActiveServicesServer,
  fetchSiteContentMapServer,
} from "@/lib/seo.server";

export const Route = createFileRoute("/llms.txt")({
  server: {
    handlers: {
      GET: async () => {
        const [siteContent, services, products] = await Promise.all([
          fetchSiteContentMapServer([
            "site_canonical_domain",
            "site_url",
            "site_description",
            "hero_subtitle",
            "contact_location_text",
            "contact_whatsapp",
            "contact_whatsapp_display",
            "contact_instagram_handle",
            "contact_instagram_url",
            "contact_email",
          ]),
          fetchActiveServicesServer(),
          fetchActiveProductsServer(),
        ]);

        const markdown = buildLlmsTxt({ siteContent, services, products });

        return new Response(markdown, {
          headers: {
            "Content-Type": "text/plain; charset=utf-8",
            "Cache-Control": "public, max-age=1800, s-maxage=1800, stale-while-revalidate=3600",
          },
        });
      },
    },
  },
});
