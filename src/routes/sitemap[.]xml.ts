import { createFileRoute } from "@tanstack/react-router";
import { SITE_URL } from "@/lib/site-url";

interface SitemapEntry {
  path: string;
  changefreq?: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  priority?: string;
}

function xmlEscape(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

async function fetchDynamicPaths(): Promise<string[]> {
  // This handler runs on the server; never send the service-role key to the browser.
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const [products, siteServices, quoterServices] = await Promise.all([
    supabaseAdmin.from("products").select("slug").eq("active", true),
    supabaseAdmin.from("site_services").select("slug").eq("is_active", true),
    supabaseAdmin.from("quoter_services").select("slug").eq("is_active", true),
  ]);

  if (products.error) console.error("[sitemap] No se pudieron consultar productos activos:", products.error);
  if (siteServices.error) console.error("[sitemap] No se pudieron consultar servicios activos:", siteServices.error);
  if (quoterServices.error) console.error("[sitemap] No se pudieron consultar cotizadores activos:", quoterServices.error);

  const productPaths = (products.data ?? [])
    .map((row) => row.slug)
    .filter((slug): slug is string => typeof slug === "string" && /^[a-z0-9]+(?:-[a-z0-9]+)*$/i.test(slug))
    .map((slug) => `/tienda/${slug}`);

  // The site currently has a single canonical services listing, not a detail route per service.
  // Query active services so the sitemap reflects the actual CMS state without inventing URLs.
  const hasActiveServices = (siteServices.data?.length ?? 0) > 0 || (quoterServices.data?.length ?? 0) > 0;
  return [...productPaths, ...(hasActiveServices ? ["/servicios"] : [])];
}

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const staticEntries: SitemapEntry[] = [
          { path: "/", changefreq: "weekly", priority: "1.0" },
          { path: "/servicios", changefreq: "weekly", priority: "0.9" },
          { path: "/tienda", changefreq: "weekly", priority: "0.9" },
          { path: "/cotizador", changefreq: "monthly", priority: "0.8" },
          { path: "/galeria", changefreq: "weekly", priority: "0.7" },
          { path: "/nosotros", changefreq: "yearly", priority: "0.6" },
          { path: "/contacto", changefreq: "yearly", priority: "0.7" },
        ];
        let dynamicPaths: string[] = [];
        try {
          dynamicPaths = await fetchDynamicPaths();
        } catch (error) {
          console.error("[sitemap] Falló la consulta dinámica:", error);
        }
        const entries = [
          ...staticEntries,
          ...dynamicPaths.map((path): SitemapEntry => ({
            path,
            changefreq: "weekly",
            priority: path.startsWith("/tienda/") ? "0.8" : "0.9",
          })),
        ];
        const unique = [...new Map(entries.map((entry) => [entry.path, entry])).values()];
        const urls = unique.map((entry) => [
          "  <url>",
          `    <loc>${xmlEscape(`${SITE_URL}${entry.path}`)}</loc>`,
          entry.changefreq ? `    <changefreq>${entry.changefreq}</changefreq>` : null,
          entry.priority ? `    <priority>${entry.priority}</priority>` : null,
          "  </url>",
        ].filter(Boolean).join("\n"));

        const xml = [
          '<?xml version="1.0" encoding="UTF-8"?>',
          '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
          ...urls,
          "</urlset>",
        ].join("\n");

        return new Response(xml, {
          headers: {
            "Content-Type": "application/xml; charset=utf-8",
            "Cache-Control": "no-cache, no-store, must-revalidate",
            "X-Content-Type-Options": "nosniff",
          },
        });
      },
    },
  },
});
