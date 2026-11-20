import { describe, expect, it } from "vitest";
import {
  DEFAULT_SITE_URL,
  buildLlmsTxt,
  buildRobotsTxt,
  buildSeoFromContent,
  buildSitemapXml,
  getCanonicalBaseUrl,
  getRobotsContent,
} from "./seo";

describe("Arquitectura SEO y dominio canónico", () => {
  it("getCanonicalBaseUrl usa DEFAULT_SITE_URL por defecto y limpia barras finales", () => {
    expect(DEFAULT_SITE_URL).toBe("https://will-design-3d.lovable.app");
    expect(getCanonicalBaseUrl(undefined)).toBe("https://will-design-3d.lovable.app");
    expect(getCanonicalBaseUrl({})).toBe("https://will-design-3d.lovable.app");
    expect(getCanonicalBaseUrl({ site_canonical_domain: "   " })).toBe(
      "https://will-design-3d.lovable.app",
    );
    expect(
      getCanonicalBaseUrl({
        site_canonical_domain: "https://willdesign3d.co///",
        site_url: "https://legacy.example.com",
      }),
    ).toBe("https://willdesign3d.co");
    expect(getCanonicalBaseUrl({ site_url: "https://alt.example.com/" })).toBe(
      "https://alt.example.com",
    );
    expect(getCanonicalBaseUrl({ site_canonical_domain: "custom3d.com/" })).toBe(
      "https://custom3d.com",
    );
  });

  it("buildSeoFromContent devuelve canonical dinámico con fallback oficial", () => {
    expect(buildSeoFromContent("home", {}).canonical).toBe("https://will-design-3d.lovable.app");
    expect(
      buildSeoFromContent("home", { site_canonical_domain: "https://mi3d.com/" }).canonical,
    ).toBe("https://mi3d.com");
  });

  it("getRobotsContent y buildRobotsTxt respetan site_indexable_global", () => {
    expect(getRobotsContent({})).toBe("index, follow");
    expect(getRobotsContent({ site_indexable_global: "true" })).toBe("index, follow");
    expect(getRobotsContent({ site_indexable_global: "false" })).toBe("noindex, nofollow");

    const blocked = buildRobotsTxt({
      site_indexable_global: "false",
      site_canonical_domain: "https://mi3d.com",
    });
    expect(blocked).toBe("User-agent: *\nDisallow: /\n");

    const allowed = buildRobotsTxt({
      site_indexable_global: "true",
      site_canonical_domain: "https://mi3d.com/",
    });
    expect(allowed).toContain("Allow: /");
    expect(allowed).toContain("Disallow: /admin");
    expect(allowed).toContain("Disallow: /panel");
    expect(allowed).toContain("Disallow: /auth");
    expect(allowed).toContain("Sitemap: https://mi3d.com/sitemap.xml");
  });

  it("buildSitemapXml usa el dominio base dinámico y escapa caracteres XML", () => {
    const xml = buildSitemapXml("https://mi3d.com/", [
      { path: "/", lastmod: "2026-11-19", changefreq: "daily", priority: "1.0" },
      { path: "/tienda/pla&pro", lastmod: "2026-11-19", changefreq: "weekly", priority: "0.8" },
    ]);
    expect(xml).toContain("<loc>https://mi3d.com/</loc>");
    expect(xml).toContain("<loc>https://mi3d.com/tienda/pla&amp;pro</loc>");
    expect(xml).toContain('xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"');
  });

  it("buildLlmsTxt genera Markdown estructurado con contacto, servicios y productos limpios", () => {
    const md = buildLlmsTxt({
      siteContent: {
        site_canonical_domain: "https://mi3d.com/",
        site_description: "Taller de impresión 3D y prototipado en Bogotá.",
        contact_location_text: "Cra. 28 #86-13, Bogotá",
        contact_whatsapp_display: "+57 315 672 4474",
        contact_whatsapp: "573156724474",
        contact_instagram_handle: "@will_design2020",
        contact_instagram_url: "https://www.instagram.com/will_design2020/",
      },
      services: [
        { title: "Impresión FDM", slug: "impresion-fdm", lead: "<p>Piezas <b>rápidas</b> en PLA y PETG.</p>" },
      ],
      products: [
        {
          name: "Filamento PLA+",
          slug: "pla-plus",
          price_cop: 84000,
          short: "Alta resistencia y precisión.",
          description: "",
        },
        {
          name: "Servicio Especial",
          slug: "servicio-especial",
          price_cop: 0,
          quote_only: true,
          short: "",
          description: "<p>Fabricación a medida.</p>",
        },
      ],
    });

    expect(md).toContain("# WILL DESIGN 3D — Impresión 3D, Diseño y Prototipado en Bogotá");
    expect(md).toContain("> Taller de impresión 3D y prototipado en Bogotá.");
    expect(md).toContain("- **Ubicación:** Cra. 28 #86-13, Bogotá");
    expect(md).toContain("- **WhatsApp:** +57 315 672 4474 (573156724474)");
    expect(md).toContain("- **Instagram:** @will_design2020 (https://www.instagram.com/will_design2020/)");
    expect(md).toContain("- **Sitio Web:** https://mi3d.com");
    expect(md).toContain("- [Impresión FDM](https://mi3d.com/servicios#impresion-fdm): Piezas rápidas en PLA y PETG.");
    expect(md).toContain("- [Filamento PLA+](https://mi3d.com/tienda/pla-plus): $84.000 COP. Alta resistencia y precisión.");
    expect(md).toContain("- [Servicio Especial](https://mi3d.com/tienda/servicio-especial): Bajo cotización. Fabricación a medida.");
    expect(md).toContain("- Tienda Virtual: https://mi3d.com/tienda");
  });

  it("las rutas públicas emiten canonical, og:url, JSON-LD y meta robots dinámicos", async () => {
    const customContent = {
      site_canonical_domain: "https://custom.will3d.co/",
      site_indexable_global: "false",
      site_title: "Will Design Custom",
      site_business_name: "Will Design Custom",
      hero_title: "Impresión 3D Pro",
      hero_subtitle: "Prototipado industrial en Bogotá.",
    };

    type TestHeadOutput = {
      meta: Array<{ name?: string; property?: string; content?: string }>;
      links: Array<{ rel?: string; href?: string }>;
      scripts?: Array<{ children?: string }>;
    };
    type HeadCaller = (ctx: { loaderData: { siteContent: Record<string, string> } }) => TestHeadOutput;

    const { Route: RootRoute } = await import("@/routes/__root");
    const rootHead = (RootRoute.options.head as unknown as HeadCaller)({
      loaderData: { siteContent: customContent },
    });
    expect(rootHead.meta.find((m) => m.name === "robots")?.content).toBe("noindex, nofollow");
    const rootJsonLd = JSON.parse(rootHead.scripts?.[0]?.children || "{}");
    expect(rootJsonLd["@graph"][0]["@id"]).toBe("https://custom.will3d.co/#organization");
    expect(rootJsonLd["@graph"][1].url).toBe("https://custom.will3d.co/");

    const { Route: ContactoRoute } = await import("@/routes/contacto");
    const contactoHead = (ContactoRoute.options.head as unknown as HeadCaller)({
      loaderData: { siteContent: customContent },
    });
    expect(contactoHead.meta.find((m) => m.property === "og:url")?.content).toBe(
      "https://custom.will3d.co/contacto",
    );
    expect(contactoHead.links).toEqual([{ rel: "canonical", href: "https://custom.will3d.co/contacto" }]);
    expect(JSON.parse(contactoHead.scripts?.[0]?.children || "{}").url).toBe(
      "https://custom.will3d.co/",
    );

    const { Route: TiendaRoute } = await import("@/routes/tienda.index");
    const tiendaHead = (TiendaRoute.options.head as unknown as HeadCaller)({
      loaderData: { siteContent: customContent },
    });
    expect(tiendaHead.links).toEqual([{ rel: "canonical", href: "https://custom.will3d.co/tienda" }]);

    const { Route: NosotrosRoute } = await import("@/routes/nosotros");
    const nosotrosHead = (NosotrosRoute.options.head as unknown as HeadCaller)({
      loaderData: { siteContent: customContent },
    });
    expect(nosotrosHead.links).toEqual([{ rel: "canonical", href: "https://custom.will3d.co/nosotros" }]);

    const { Route: GaleriaRoute } = await import("@/routes/galeria");
    const galeriaHead = (GaleriaRoute.options.head as unknown as HeadCaller)({
      loaderData: { siteContent: customContent },
    });
    expect(galeriaHead.links).toEqual([{ rel: "canonical", href: "https://custom.will3d.co/galeria" }]);

    const { Route: ServiciosRoute } = await import("@/routes/servicios");
    const serviciosHead = (ServiciosRoute.options.head as unknown as HeadCaller)({
      loaderData: { siteContent: customContent },
    });
    expect(serviciosHead.links).toEqual([{ rel: "canonical", href: "https://custom.will3d.co/servicios" }]);

    const { Route: CotizadorRoute } = await import("@/routes/cotizador");
    const cotizadorHead = (CotizadorRoute.options.head as unknown as HeadCaller)({
      loaderData: { siteContent: customContent },
    });
    expect(cotizadorHead.links).toEqual([{ rel: "canonical", href: "https://custom.will3d.co/cotizador" }]);
  });
});
