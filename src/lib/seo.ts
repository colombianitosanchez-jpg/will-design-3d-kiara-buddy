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
  const defaultGlobalImage =
    globalSeo?.site_meta_thumbnail_url?.trim() ||
    globalSeo?.site_logo_url?.trim() ||
    "";

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

  const image =
    pageData?.seo_image?.trim() ||
    pageData?.image?.trim() ||
    pageData?.hero_image_url?.trim() ||
    pageData?.main_image_url?.trim() ||
    defaultGlobalImage;

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
  const globalImage = content.site_meta_thumbnail_url?.trim() || content.site_logo_url?.trim() || "";

  let title = globalTitle;
  let description = globalDesc;
  let image = globalImage;

  if (page === 'home') {
    title = content.hero_title?.trim() || globalTitle;
    description = content.hero_subtitle?.trim() || globalDesc;
    image = content.hero_image_url?.trim() || globalImage;
  } else if (page === 'producto' && item) {
    title = item.name ? `${item.name} | ${globalTitle}` : globalTitle;
    const cleanDesc = item.short || item.description?.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
    description = cleanDesc?.slice(0, 155) || globalDesc;
    image = item.images?.[0] || item.image_url || globalImage;
  } else if (page === 'servicio') {
    if (item?.title) {
      title = `${item.title} | ${globalTitle}`;
      description = item.lead?.trim() || globalDesc;
      image = item.image_url?.trim() || globalImage;
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
    canonical: content.site_url || "https://willdesign3d.com",
  };
}
