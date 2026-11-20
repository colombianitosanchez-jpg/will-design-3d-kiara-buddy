import { createFileRoute } from "@tanstack/react-router";
import { buildSitemapXml, getCanonicalBaseUrl, type SitemapEntry } from "@/lib/seo";
import {
  fetchActiveProductsServer,
  fetchActiveServicesServer,
  fetchSiteContentMapServer,
} from "@/lib/seo.server";

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const todayIso = new Date().toISOString().split("T")[0];

        const staticEntries: SitemapEntry[] = [
          { path: "/", lastmod: todayIso, changefreq: "daily", priority: "1.0" },
          { path: "/servicios", lastmod: todayIso, changefreq: "weekly", priority: "0.9" },
          { path: "/tienda", lastmod: todayIso, changefreq: "daily", priority: "0.9" },
          { path: "/cotizador", lastmod: todayIso, changefreq: "weekly", priority: "0.8" },
          { path: "/galeria", lastmod: todayIso, changefreq: "weekly", priority: "0.7" },
          { path: "/nosotros", lastmod: todayIso, changefreq: "monthly", priority: "0.6" },
          { path: "/contacto", lastmod: todayIso, changefreq: "monthly", priority: "0.7" },
        ];

        const [siteContent, products, services] = await Promise.all([
          fetchSiteContentMapServer(["site_canonical_domain", "site_url"]),
          fetchActiveProductsServer(),
          fetchActiveServicesServer(),
        ]);

        const baseUrl = getCanonicalBaseUrl(siteContent);

        const serviceEntries: SitemapEntry[] = services
          .filter((s) => s?.slug)
          .map((s) => {
            const dateStr = s.updated_at || s.created_at;
            return {
              path: `/servicios#${s.slug}`,
              lastmod: dateStr ? new Date(dateStr).toISOString().split("T")[0] : todayIso,
              changefreq: "weekly",
              priority: "0.8",
            };
          });

        const productEntries: SitemapEntry[] = products
          .filter((p) => p?.slug)
          .map((p) => {
            const dateStr = p.updated_at || p.created_at;
            const lastmod = dateStr ? new Date(dateStr).toISOString().split("T")[0] : todayIso;
            return {
              path: `/tienda/${p.slug}`,
              lastmod,
              changefreq: "weekly",
              priority: "0.8",
            };
          });

        const entries = [...staticEntries, ...serviceEntries, ...productEntries];
        const xml = buildSitemapXml(baseUrl, entries);

        return new Response(xml, {
          headers: {
            "Content-Type": "application/xml; charset=utf-8",
            "Cache-Control": "public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400",
          },
        });
      },
    },
  },
});
