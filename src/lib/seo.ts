import { firstStaticShareImage } from "./share-image";
import { productPlainText, productSummary } from "./product-description";

export const DEFAULT_SITE_URL = "https://will-design-3d.lovable.app";

export function getCanonicalBaseUrl(siteContent?: Record<string, string> | null): string {
  const raw =
    siteContent?.site_canonical_domain?.trim() ||
    siteContent?.site_url?.trim() ||
    DEFAULT_SITE_URL;
  const stripped = raw.replace(/\/+$/, "");
  if (!stripped) return DEFAULT_SITE_URL;
  return /^https?:\/\//i.test(stripped) ? stripped : `https://${stripped}`;
}

export function getRobotsContent(siteContent?: Record<string, string> | null): "index, follow" | "noindex, nofollow" {
  return String(siteContent?.site_indexable_global ?? "").trim().toLowerCase() === "false"
    ? "noindex, nofollow"
    : "index, follow";
}

export function buildRobotsTxt(siteContent?: Record<string, string> | null): string {
  const isBlocked = String(siteContent?.site_indexable_global ?? "").trim().toLowerCase() === "false";
  if (isBlocked) {
    return ["User-agent: *", "Disallow: /", ""].join("\n");
  }
  const baseUrl = getCanonicalBaseUrl(siteContent);
  return [
    "User-agent: *",
    "Allow: /",
    "Disallow: /admin",
    "Disallow: /panel",
    "Disallow: /auth",
    "",
    `Sitemap: ${baseUrl}/sitemap.xml`,
    "",
  ].join("\n");
}

export interface SitemapEntry {
  path: string;
  lastmod?: string;
  changefreq?: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  priority?: string;
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export function buildSitemapXml(
  baseUrl: string,
  entries: SitemapEntry[],
): string {
  const cleanBase = baseUrl.replace(/\/+$/, "");
  const urls = entries.map((e) =>
    [
      "  <url>",
      `    <loc>${escapeXml(`${cleanBase}${e.path}`)}</loc>`,
      e.lastmod ? `    <lastmod>${escapeXml(e.lastmod)}</lastmod>` : null,
      e.changefreq ? `    <changefreq>${escapeXml(e.changefreq)}</changefreq>` : null,
      e.priority ? `    <priority>${escapeXml(e.priority)}</priority>` : null,
      "  </url>",
    ]
      .filter(Boolean)
      .join("\n"),
  );

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...urls,
    "</urlset>",
  ].join("\n");
}

export interface LlmsServiceItem {
  title: string;
  slug: string;
  lead?: string | null;
}

export interface LlmsProductItem {
  name: string;
  slug: string;
  price_cop: number;
  short?: string | null;
  description?: string | null;
  quote_only?: boolean | null;
}

function formatCopSimple(amount: number): string {
  const n = Math.round(Number(amount) || 0);
  return `$${n.toLocaleString("es-CO")}`;
}

export function buildLlmsTxt(input: {
  siteContent?: Record<string, string> | null;
  services?: LlmsServiceItem[];
  products?: LlmsProductItem[];
}): string {
  const siteContent = input.siteContent ?? {};
  const baseUrl = getCanonicalBaseUrl(siteContent);
  const summary =
    siteContent.site_description?.trim() ||
    siteContent.hero_subtitle?.trim() ||
    "Taller especializado en impresión 3D, prototipado rápido, diseño mecánico, escaneo 3D y venta de equipos e insumos en Bogotá, Colombia.";

  const location = siteContent.contact_location_text?.trim() || "Bogotá, Colombia";
  const waDisplay = siteContent.contact_whatsapp_display?.trim() || "";
  const waNumber = siteContent.contact_whatsapp?.trim() || "";
  const waLine =
    waDisplay && waNumber
      ? `${waDisplay} (${waNumber})`
      : waDisplay || waNumber || "Consultar en el sitio web";

  const igHandle = siteContent.contact_instagram_handle?.trim() || "";
  const igUrl = siteContent.contact_instagram_url?.trim() || "";
  const igLine =
    igHandle && igUrl
      ? `${igHandle} (${igUrl})`
      : igHandle || igUrl || "https://www.instagram.com/will_design2020";

  const email = siteContent.contact_email?.trim() || "";

  const companyLines = [
    `- **Ubicación:** ${location}`,
    `- **WhatsApp:** ${waLine}`,
    `- **Instagram:** ${igLine}`,
    ...(email ? [`- **Correo:** ${email}`] : []),
    `- **Sitio Web:** ${baseUrl}`,
  ];

  const services = (input.services ?? []).filter((s) => s?.title?.trim() && s?.slug?.trim());
  const serviceLines = services.length
    ? services.map((s) => {
        const desc = productPlainText(s.lead) || "Servicio personalizado de impresión y fabricación 3D.";
        return `- [${s.title.trim()}](${baseUrl}/servicios#${s.slug.trim()}): ${desc}`;
      })
    : [`- [Servicios 3D y Cotizaciones](${baseUrl}/servicios): Impresión 3D FDM y resina, diseño CAD, escaneo y mantenimiento.`];

  const products = (input.products ?? []).filter((p) => p?.name?.trim() && p?.slug?.trim());
  const productLines = products.length
    ? products.map((p) => {
        const pricePart = p.quote_only
          ? "Bajo cotización."
          : `${formatCopSimple(p.price_cop)} COP.`;
        const desc = productSummary({ short: p.short ?? "", description: p.description ?? "" });
        return `- [${p.name.trim()}](${baseUrl}/tienda/${p.slug.trim()}): ${pricePart}${desc ? ` ${desc}` : ""}`;
      })
    : [`- [Catálogo Completo](${baseUrl}/tienda): Impresoras 3D, filamentos, resinas y repuestos disponibles.`];

  return [
    "# WILL DESIGN 3D — Impresión 3D, Diseño y Prototipado en Bogotá",
    "",
    `> ${summary}`,
    "",
    "## Información de la Empresa",
    ...companyLines,
    "",
    "## Servicios Principales",
    ...serviceLines,
    "",
    "## Catálogo Destacado de Productos",
    ...productLines,
    "",
    "## Enlaces Principales",
    `- Inicio: ${baseUrl}/`,
    `- Servicios y Cotizaciones: ${baseUrl}/servicios`,
    `- Cotizador en Línea: ${baseUrl}/cotizador`,
    `- Tienda Virtual: ${baseUrl}/tienda`,
    `- Galería de Proyectos: ${baseUrl}/galeria`,
    `- Sobre Nosotros: ${baseUrl}/nosotros`,
    `- Contacto: ${baseUrl}/contacto`,
    "",
  ].join("\n");
}

export type PageSeoInput = {
  seo_title?: string;
  title?: string;
  hero_title?: string;
  name?: string;
  seo_description?: string;
  description?: string;
  hero_subtitle?: string;
  about_short?: string;
  lead?: string;
  summary?: string;
  seo_image?: string;
  image?: string;
  hero_image_url?: string;
  main_image_url?: string;
  canonicalUrl?: string;
};

export type GlobalSeoInput = {
  site_title?: string;
  site_description?: string;
  site_meta_thumbnail_url?: string;
  site_logo_url?: string;
  site_url?: string;
  site_canonical_domain?: string;
  site_indexable_global?: string;
  [key: string]: any;
};

export type SeoResult = {
  title: string;
  description: string;
  image: string;
  canonicalUrl?: string;
};

/**
  * Genera datos SEO priorizando el contenido específico de la página
  * (override) y cayendo suavemente al SEO global configurado en el panel.
  */
export function getSeo(
  pageData?: PageSeoInput | null,
  globalSeo?: GlobalSeoInput | null
): SeoResult {
  const defaultGlobalTitle = globalSeo?.site_title?.trim() || "Will Design 3D";
  const defaultGlobalDesc = globalSeo?.site_description?.trim() || "";
  const defaultGlobalImage = firstStaticShareImage([
    globalSeo?.site_meta_thumbnail_url, globalSeo?.site_logo_url,
  ]);

  const title =
    pageData?.seo_title?.trim() ||
    pageData?.title?.trim() ||
    pageData?.hero_title?.trim() ||
    pageData?.name?.trim() ||
    defaultGlobalTitle;

  const description =
    pageData?.seo_description?.trim() ||
    pageData?.description?.trim() ||
    pageData?.hero_subtitle?.trim() ||
    pageData?.about_short?.trim() ||
    pageData?.lead?.trim() ||
    pageData?.summary?.trim() ||
    defaultGlobalDesc;

  const image = firstStaticShareImage([
    pageData?.seo_image, pageData?.image, pageData?.hero_image_url,
    pageData?.main_image_url, defaultGlobalImage,
  ]);

  return {
    title,
    description,
    image,
    canonicalUrl: pageData?.canonicalUrl,
  };
}

export type SeoPageType =
  | 'home'
  | 'producto'
  | 'servicio'
  | 'marca'
  | 'nosotros'
  | 'galeria'
  | 'contacto'
  | 'tienda';

/**
 * Genera datos SEO de forma 100% dinámico-programática desde la clave de página
 * y los datos de contenido del sitio o ítem individual.
 */
export function buildSeoFromContent(
  page: SeoPageType,
  content: Record<string, string>,
  item?: any
) {
  const globalTitle = content.site_title?.trim() || "Will Design 3D";
  const globalDesc = content.site_description?.trim() || content.site_description_fallback?.trim() || "";
  const globalImage = firstStaticShareImage([content.site_meta_thumbnail_url, content.site_logo_url]);

  let title = globalTitle;
  let description = globalDesc;
  let image = globalImage;

  if (page === 'home') {
    title = content.hero_title?.trim() || globalTitle;
    description = content.hero_subtitle?.trim() || globalDesc;
    image = firstStaticShareImage([content.hero_image_url, globalImage]);
  } else if (page === 'producto' && item) {
    title = item.name ? `${item.name} | ${globalTitle}` : globalTitle;
    const cleanDesc = item.short || item.description?.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
    description = cleanDesc?.slice(0, 155) || globalDesc;
    image = firstStaticShareImage([item.image_url, ...(item.images ?? []), globalImage]);
  } else if (page === 'servicio') {
    if (item?.title) {
      title = `${item.title} | ${globalTitle}`;
      description = item.lead?.trim() || globalDesc;
      image = firstStaticShareImage([item.image_url, globalImage]);
    } else {
      title = content.services_section_title ? `${content.services_section_title} | ${globalTitle}` : `Servicios | ${globalTitle}`;
      description = content.services_section_subtitle?.trim() || globalDesc;
    }
  } else if (page === 'nosotros') {
    title = `Nosotros | ${globalTitle}`;
    description = content.about_short?.trim() || globalDesc;
  } else if (page === 'galeria') {
    title = `Galería | ${globalTitle}`;
  } else if (page === 'contacto') {
    title = `Contacto | ${globalTitle}`;
  } else if (page === 'tienda') {
    title = `Tienda | ${globalTitle}`;
  } else if (page === 'marca') {
    title = globalTitle;
  }

  return {
    title,
    description,
    ogTitle: title,
    ogDescription: description,
    ogImage: image,
    image,
    canonical: getCanonicalBaseUrl(content),
  };
}
