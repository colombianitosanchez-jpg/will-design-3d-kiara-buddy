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
