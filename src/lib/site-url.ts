/** Canonical public origin. Set VITE_SITE_URL in deployment to use the production domain. */
const configuredSiteUrl = import.meta.env.VITE_SITE_URL;

export const SITE_URL = (
  typeof configuredSiteUrl === "string" && configuredSiteUrl.trim()
    ? configuredSiteUrl.trim()
    : "https://will-design-3d-kiara-buddy.lovable.app"
).replace(/\/+$/, "");
