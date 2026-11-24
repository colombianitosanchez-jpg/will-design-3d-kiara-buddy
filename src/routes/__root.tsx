import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { lazy, Suspense, useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { SiteHeader } from "../components/SiteHeader";
import { SiteFooter } from "../components/SiteFooter";
import { LiveBanner } from "../components/LiveBanner";
import { Toaster } from "../components/ui/sonner";

const KiaraWidget = lazy(() =>
  import("../components/KiaraWidget").then((m) => ({ default: m.KiaraWidget }))
);
import { AuthProvider } from "../hooks/use-auth";
import { ErrorBoundary } from "../components/ErrorBoundary";
import { CartProvider } from "../lib/cart";
import { useQuery } from "@tanstack/react-query";
import { siteContentQuery, categoriesQuery } from "../lib/catalog";
import { siteServicesQuery } from "./servicios";
import { menuItemsQuery } from "../lib/menu";
import { getActiveTheme, applyThemeToDocument, buildThemeGlobalCss } from "../lib/theme";
import { getCanonicalBaseUrl, getRobotsContent, getSeo } from "../lib/seo";
import { toAbsoluteUrl } from "../lib/whatsapp-buttons";
import { AmbientBackdrop } from "../components/AmbientBackdrop";
import { safeEnsureQueryResult } from "../lib/ssr-resilience";

function ThemeApplier() {
  const loaderData = Route.useLoaderData();
  const { data: content } = useQuery({
    ...siteContentQuery(),
    initialData: loaderData?.siteContent,
  });
  const activeTheme = getActiveTheme(content);
  useEffect(() => {
    applyThemeToDocument(activeTheme);
  }, [activeTheme]);
  return (
    <AmbientBackdrop
      background={activeTheme.background}
      effect={activeTheme.ambient?.effect}
      intensity={activeTheme.ambient?.intensity}
    />
  );
}


function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Página no encontrada</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          La página que buscas no existe o ha sido trasladada.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Volver al inicio
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: unknown; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          No pudimos cargar esta página
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Ocurrió un error inesperado al cargar el contenido. Puedes intentar recargar la página o
          volver al inicio.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Reintentar
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Volver al inicio
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  loader: async ({ context }) => {
    const [siteContentRes, menuItemsRes, categoriesRes, siteServicesRes] = await Promise.all([
      safeEnsureQueryResult(context.queryClient, siteContentQuery(), {} as Record<string, string>, "site_content"),
      safeEnsureQueryResult(context.queryClient, menuItemsQuery(), [], "menu_items"),
      safeEnsureQueryResult(context.queryClient, categoriesQuery(), [], "categories"),
      safeEnsureQueryResult(context.queryClient, siteServicesQuery(), [], "site_services"),
    ]);
    return {
      siteContent: siteContentRes.data,
      menuItems: menuItemsRes.data,
      categories: categoriesRes.data,
      siteServices: siteServicesRes.data,
      backendDegraded:
        siteContentRes.degraded ||
        menuItemsRes.degraded ||
        categoriesRes.degraded ||
        siteServicesRes.degraded,
    };
  },
  head: ({ loaderData }) => {
    const siteContent = loaderData?.siteContent;
    const seo = getSeo(null, siteContent);
    const baseUrl = getCanonicalBaseUrl(siteContent);
    const robotsContent = getRobotsContent(siteContent);
    const favicon = siteContent?.site_favicon_url || "/favicon.ico";
    const businessName = siteContent?.site_business_name || "Will Design 3D";
    const areaServed = siteContent?.site_area_served || "";
    const instagramUrl = siteContent?.contact_instagram_url || "https://www.instagram.com/will_design2020";

    const title = seo.title;
    const desc = seo.description;

    const ogImage = seo.image ? toAbsoluteUrl(seo.image, siteContent) : "";

    const metaTags: Array<Record<string, string>> = [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { name: "robots", content: robotsContent },
      { title },
      { name: "description", content: desc },
      { property: "og:title", content: title },
      { property: "og:description", content: desc },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: title },
      { name: "twitter:description", content: desc },
      ...(ogImage
        ? [
            { property: "og:image", content: ogImage },
            { name: "twitter:image", content: ogImage },
          ]
        : []),
    ];

    const activeTheme = getActiveTheme(siteContent);
    const themeCss = buildThemeGlobalCss(activeTheme);
    const bgMediaUrl = activeTheme.background?.mediaUrl?.trim() || "";
    const hasMediaBg = Boolean(
      bgMediaUrl && activeTheme.background?.type && activeTheme.background.type !== "solid",
    );
    const isVideoBg =
      activeTheme.background?.type === "video" || /\.(mp4|webm|mov)(\?|$)/i.test(bgMediaUrl);
    const mediaPreloadLinks = hasMediaBg
      ? [
          isVideoBg
            ? {
                rel: "preload",
                as: "video",
                href: bgMediaUrl,
                type: /\.webm(\?|$)/i.test(bgMediaUrl) ? "video/webm" : "video/mp4",
              }
            : {
                rel: "preload",
                as: "image",
                href: bgMediaUrl,
                fetchPriority: "high" as const,
              },
        ]
      : [];

    return {
      meta: metaTags,
      links: [
        { rel: "stylesheet", href: appCss },
        { rel: "icon", href: favicon },
        { rel: "shortcut icon", href: favicon },
        { rel: "apple-touch-icon", href: favicon },
        ...mediaPreloadLinks,
      ],
      styles: [
        {
          id: "active-theme-custom-css",
          children: themeCss,
        },
      ],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@graph": [
              {
                "@type": "Organization",
                "@id": `${baseUrl}/#organization`,
                name: businessName,
                url: `${baseUrl}/`,
                description: desc,
                areaServed: areaServed,
                sameAs: [instagramUrl],
              },
              {
                "@type": "WebSite",
                "@id": `${baseUrl}/#website`,
                url: `${baseUrl}/`,
                name: businessName,
                inLanguage: "es-CO",
                publisher: { "@id": `${baseUrl}/#organization` },
              },
            ],
          }),
        },
      ],
    };
  },

  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="es-CO">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const loaderData = Route.useLoaderData();
  const router = useRouter();
  const backendDegraded = Boolean(loaderData?.backendDegraded);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeApplier />
      <AuthProvider>
        <CartProvider>
          <div className="relative flex min-h-screen flex-col text-foreground">
            <LiveBanner />
            {backendDegraded && (
              <div
                role="status"
                className="relative z-40 border-b border-amber-500/30 bg-amber-500/10 px-4 py-2 text-center text-xs text-foreground"
              >
                <span>
                  Conexión temporalmente limitada con el catálogo. Algunas secciones pueden mostrarse incompletas.
                </span>{" "}
                <button
                  type="button"
                  onClick={() => router.invalidate()}
                  className="ml-2 font-semibold underline underline-offset-2 hover:opacity-80"
                >
                  Reintentar
                </button>
              </div>
            )}
            <SiteHeader />
            <main className="relative z-10 flex-1">
              {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
              <ErrorBoundary label="root_layout">
                <Outlet />
              </ErrorBoundary>
            </main>
            <SiteFooter />
            <Suspense fallback={null}>
              <KiaraWidget />
            </Suspense>
            <Toaster />
          </div>
        </CartProvider>
      </AuthProvider>

    </QueryClientProvider>
  );
}
