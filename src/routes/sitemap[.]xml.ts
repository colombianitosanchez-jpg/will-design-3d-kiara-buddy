import { createFileRoute } from "@tanstack/react-router";

const BASE_URL = "https://will-design-3d.lovable.app";

interface SitemapEntry {
  path: string;
  lastmod?: string;
  changefreq?: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  priority?: string;
}

function getEnv(key: string): string | undefined {
  if (typeof process !== "undefined" && process.env && process.env[key]) {
    return process.env[key];
  }
  if (typeof import.meta !== "undefined" && (import.meta as any).env) {
    return (import.meta as any).env[key];
  }
  return undefined;
}

async function fetchProducts(): Promise<Array<{ slug: string; updated_at?: string; created_at?: string }>> {
  const url = getEnv("VITE_SUPABASE_URL");
  const key = getEnv("VITE_SUPABASE_PUBLISHABLE_KEY");
  if (!url || !key) return [];
  try {
    const res = await fetch(`${url}/rest/v1/products?select=slug,created_at,updated_at&active=eq.true`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
    });
    if (!res.ok) return [];
    return (await res.json()) as any;
  } catch {
    return [];
  }
}

async function fetchServices(): Promise<Array<{ slug: string; updated_at?: string }>> {
  const url = getEnv("VITE_SUPABASE_URL");
  const key = getEnv("VITE_SUPABASE_PUBLISHABLE_KEY");
  if (!url || !key) return [];
  try {
    const res = await fetch(`${url}/rest/v1/site_services?select=slug,created_at&is_active=eq.true`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
    });
    if (!res.ok) return [];
    return (await res.json()) as any;
  } catch {
    return [];
  }
}

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

        const [products, services] = await Promise.all([fetchProducts(), fetchServices()]);

        const serviceEntries: SitemapEntry[] = services
          .filter((s) => s?.slug)
          .map((s) => ({
            path: `/servicios#${s.slug}`,
            lastmod: s.updated_at ? new Date(s.updated_at).toISOString().split("T")[0] : todayIso,
            changefreq: "weekly",
            priority: "0.8",
          }));

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

        const urls = entries.map((e) =>
          [
            `  <url>`,
            `    <loc>${BASE_URL}${e.path}</loc>`,
            e.lastmod ? `    <lastmod>${e.lastmod}</lastmod>` : null,
            e.changefreq ? `    <changefreq>${e.changefreq}</changefreq>` : null,
            e.priority ? `    <priority>${e.priority}</priority>` : null,
            `  </url>`,
          ]
            .filter(Boolean)
            .join("\n"),
        );

        const xml = [
          `<?xml version="1.0" encoding="UTF-8"?>`,
          `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
          ...urls,
          `</urlset>`,
        ].join("\n");

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
