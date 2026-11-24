import { describe, expect, it } from "vitest";
import {
  DEFAULT_SITE_URL,
  buildLlmsTxt,
  buildRobotsTxt,
  buildSeoFromContent,
  buildServicesJsonLd,
  buildSitemapXml,
  getCanonicalBaseUrl,
  getRobotsContent,
  resolvePageSeo,
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
  }, 15000);

  it("buildServicesJsonLd genera Schema.org ItemList para servicios activos y omite lista vacía", () => {
    expect(buildServicesJsonLd([], {})).toBeNull();
    expect(buildServicesJsonLd([{ id: "1", title: "Oculto", is_active: false }], {})).toBeNull();

    const jsonLd = buildServicesJsonLd(
      [
        {
          id: "svc-1",
          slug: "impresion-fdm",
          title: "Impresión 3D FDM",
          lead: "Prototipos funcionales en PLA y PETG.",
          is_active: true,
        },
        {
          id: "svc-2",
          slug: "",
          title: "Escaneo 3D",
          lead: "",
          is_active: true,
        },
      ],
      {
        site_canonical_domain: "https://mi3d.com/",
        site_business_name: "Will Design Studio",
        site_area_served: "Medellín, Colombia",
      },
    );

    expect(jsonLd).toEqual({
      "@context": "https://schema.org",
      "@type": "ItemList",
      name: "Servicios de Impresión 3D y Fabricación Digital",
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          item: {
            "@type": "Service",
            name: "Impresión 3D FDM",
            description: "Prototipos funcionales en PLA y PETG.",
            url: "https://mi3d.com/servicios#impresion-fdm",
            provider: {
              "@type": "LocalBusiness",
              name: "Will Design Studio",
              url: "https://mi3d.com/",
            },
            areaServed: "Medellín, Colombia",
          },
        },
        {
          "@type": "ListItem",
          position: 2,
          item: {
            "@type": "Service",
            name: "Escaneo 3D",
            description: "Escaneo 3D",
            url: "https://mi3d.com/servicios#svc-2",
            provider: {
              "@type": "LocalBusiness",
              name: "Will Design Studio",
              url: "https://mi3d.com/",
            },
            areaServed: "Medellín, Colombia",
          },
        },
      ],
    });
  });

  it("la ruta /servicios emite script JSON-LD ItemList solo cuando hay servicios activos", async () => {
    const { Route: ServiciosRoute } = await import("@/routes/servicios");
    type ServiciosHeadCaller = (ctx: {
      loaderData: {
        siteContent: Record<string, string>;
        siteServices: Array<{ id: string; slug: string; title: string; lead: string; is_active: boolean }>;
      };
    }) => {
      meta: Array<{ name?: string; property?: string; content?: string }>;
      scripts?: Array<{ type: string; children: string }>;
    };

    const emptyHead = (ServiciosRoute.options.head as unknown as ServiciosHeadCaller)({
      loaderData: { siteContent: {}, siteServices: [] },
    });
    expect(emptyHead.scripts).toBeUndefined();

    const populatedHead = (ServiciosRoute.options.head as unknown as ServiciosHeadCaller)({
      loaderData: {
        siteContent: { site_canonical_domain: "https://will3d.co" },
        siteServices: [
          {
            id: "s1",
            slug: "diseno-cad",
            title: "Diseño CAD 3D",
            lead: "Modelado técnico de piezas mecánicas.",
            is_active: true,
          },
        ],
      },
    });
    expect(populatedHead.scripts).toHaveLength(1);
    const parsed = JSON.parse(populatedHead.scripts?.[0]?.children || "{}");
    expect(parsed["@type"]).toBe("ItemList");
    expect(parsed.itemListElement[0].item.url).toBe("https://will3d.co/servicios#diseno-cad");
    expect(parsed.itemListElement[0].item.areaServed).toBe("Bogotá, Colombia");
  });

  it("resolvePageSeo aplica overrides granulares por página y descarta imágenes animadas", async () => {
    const content: Record<string, string> = {
      site_title: "Will Design 3D",
      site_description: "Descripción global",
      site_meta_thumbnail_url: "https://cdn.example.com/global-og.jpg",
      seo_servicios_title: "Servicios Industriales 3D",
      seo_servicios_description: "Impresión FDM, SLA y diseño mecánico a medida.",
      seo_servicios_image: "https://cdn.example.com/anim.gif",
      seo_cotizador_title: "Cotiza tu pieza 3D hoy",
      seo_cotizador_image: "https://cdn.example.com/cotizador-og.png",
    };

    const serviciosSeo = resolvePageSeo("servicios", content);
    expect(serviciosSeo.title).toBe("Servicios Industriales 3D");
    expect(serviciosSeo.description).toBe("Impresión FDM, SLA y diseño mecánico a medida.");
    expect(serviciosSeo.image).toBe("https://cdn.example.com/global-og.jpg");

    const cotizadorSeo = resolvePageSeo("cotizador", content);
    expect(cotizadorSeo.title).toBe("Cotiza tu pieza 3D hoy");
    expect(cotizadorSeo.image).toBe("https://cdn.example.com/cotizador-og.png");

    const { Route: ServiciosRoute } = await import("@/routes/servicios");
    type HeadCaller = (ctx: { loaderData: { siteContent: Record<string, string> } }) => {
      meta: Array<{ title?: string; name?: string; property?: string; content?: string }>;
    };
    const serviciosHead = (ServiciosRoute.options.head as unknown as HeadCaller)({
      loaderData: { siteContent: content },
    });
    expect(serviciosHead.meta.find((m) => "title" in m)?.title).toBe("Servicios Industriales 3D");
    expect(serviciosHead.meta.find((m) => m.property === "og:image")?.content).toBe(
      "https://cdn.example.com/global-og.jpg",
    );
  });

  it("las rutas /pedido/$token, /cotizacion/$id, /servicios y __root emiten og:image y twitter:image", async () => {
    type HeadFn = (ctx: Record<string, unknown>) => {
      meta: Array<Record<string, string>>;
    };
    const find = (meta: Array<Record<string, string>>, key: string) =>
      meta.find((m) => m.property === key || m.name === key)?.content;

    const { Route: RootRoute } = await import("@/routes/__root");
    const rootHead = (RootRoute.options.head as unknown as HeadFn)({
      loaderData: {
        siteContent: {
          site_canonical_domain: "https://will3d.co",
          site_logo_url: "/brand-logo.png",
        },
      },
    });
    expect(find(rootHead.meta, "og:image")).toBe("https://will3d.co/brand-logo.png");
    expect(find(rootHead.meta, "twitter:image")).toBe("https://will3d.co/brand-logo.png");

    const { Route: PedidoRoute } = await import("@/routes/pedido.$token");
    const pedidoHead = (PedidoRoute.options.head as unknown as HeadFn)({
      params: { token: "abc-token" },
      loaderData: {
        siteContent: {
          site_canonical_domain: "https://will3d.co",
          site_meta_thumbnail_url: "https://cdn.example.com/brand-thumb.png",
        },
      },
    });
    expect(find(pedidoHead.meta, "robots")).toBe("noindex, nofollow");
    expect(find(pedidoHead.meta, "og:url")).toBe("https://will3d.co/pedido/abc-token");
    expect(find(pedidoHead.meta, "og:image")).toBe("https://cdn.example.com/brand-thumb.png");
    expect(find(pedidoHead.meta, "og:image:secure_url")).toBe("https://cdn.example.com/brand-thumb.png");
    expect(find(pedidoHead.meta, "og:image:width")).toBe("1200");
    expect(find(pedidoHead.meta, "og:image:height")).toBe("630");
    expect(find(pedidoHead.meta, "twitter:image")).toBe("https://cdn.example.com/brand-thumb.png");

    const { Route: CotizacionRoute } = await import("@/routes/cotizacion.$id");
    const quoteWithItemImg = (CotizacionRoute.options.head as unknown as HeadFn)({
      params: { id: "12345678-0000-0000-0000-000000000000" },
      loaderData: {
        siteContent: {
          site_canonical_domain: "https://will3d.co",
          site_logo_url: "https://cdn.example.com/logo.png",
        },
        quote: {
          id: "12345678-0000-0000-0000-000000000000",
          total_price: 90000,
          created_at: "2026-11-21T00:00:00Z",
          items: [
            { kind: "product", product_id: "p1", name: "PLA+", price_cop: 90000, quantity: 1, image_url: "https://cdn.example.com/pla.jpg" },
          ],
        },
      },
    });
    expect(find(quoteWithItemImg.meta, "og:image")).toBe("https://cdn.example.com/pla.jpg");
    expect(find(quoteWithItemImg.meta, "og:url")).toBe("https://will3d.co/cotizacion/12345678-0000-0000-0000-000000000000");

    const quoteFallbackLogo = (CotizacionRoute.options.head as unknown as HeadFn)({
      params: { id: "12345678-0000-0000-0000-000000000000" },
      loaderData: {
        siteContent: {
          site_canonical_domain: "https://will3d.co",
          site_logo_url: "/logo-empresa.png",
        },
        quote: {
          id: "12345678-0000-0000-0000-000000000000",
          total_price: 50000,
          created_at: "2026-11-21T00:00:00Z",
          items: [
            { kind: "service", product_id: "s1", name: "Diseño CAD", price_cop: 50000, quantity: 1, image_url: null },
          ],
        },
      },
    });
    expect(find(quoteFallbackLogo.meta, "og:image")).toBe("https://will3d.co/logo-empresa.png");

    const { Route: ServiciosRoute } = await import("@/routes/servicios");
    const serviciosFallback = (ServiciosRoute.options.head as unknown as HeadFn)({
      loaderData: {
        siteContent: { site_canonical_domain: "https://will3d.co" },
        siteServices: [
          {
            id: "s1",
            slug: "impresion-fdm",
            title: "Impresión FDM",
            lead: "Piezas rápidas",
            is_active: true,
            image_url: "https://cdn.example.com/service-fdm.jpg",
          },
        ],
      },
    });
    expect(find(serviciosFallback.meta, "og:image")).toBe("https://cdn.example.com/service-fdm.jpg");
    expect(find(serviciosFallback.meta, "og:image:secure_url")).toBe("https://cdn.example.com/service-fdm.jpg");
  });
});
