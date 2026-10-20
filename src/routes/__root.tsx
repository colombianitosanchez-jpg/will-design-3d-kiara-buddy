import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { SiteHeader } from "../components/SiteHeader";
import { SiteFooter } from "../components/SiteFooter";
import { LiveBanner } from "../components/LiveBanner";
import { KiaraWidget } from "../components/KiaraWidget";
import { Toaster } from "../components/ui/sonner";
import { AuthProvider } from "../hooks/use-auth";
import { ErrorBoundary } from "../components/ErrorBoundary";
import { CartProvider } from "../lib/cart";
import { useQuery } from "@tanstack/react-query";
import { siteContentQuery } from "../lib/catalog";
import { getActiveTheme, applyThemeToDocument } from "../lib/theme";
import { SITE_URL } from "../lib/site-url";

function ThemeApplier() {
  const { data: content } = useQuery(siteContentQuery());
  useEffect(() => {
    const activeTheme = getActiveTheme(content);
    applyThemeToDocument(activeTheme);

    if (content?.site_favicon_url) {
      let iconEl = document.querySelector("link[rel='icon']") as HTMLLinkElement | null;
      if (!iconEl) {
        iconEl = document.createElement("link");
        iconEl.rel = "icon";
        document.head.appendChild(iconEl);
      }
      iconEl.href = content.site_favicon_url;
    }
  }, [content]);
  return null;
}

/** Unregister a legacy PWA worker if an earlier deployment left one controlling the origin. */
function LegacyServiceWorkerCleanup() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    void navigator.serviceWorker.getRegistrations().then((registrations) => {
      registrations.forEach((registration) => void registration.unregister());
    });
    if ("caches" in window) {
      void window.caches.keys().then((names) => {
        names
          .filter((name) => /will[-_ ]?design|workbox|vite[-_ ]?pwa|precache/i.test(name))
          .forEach((name) => void window.caches.delete(name));
      });
    }
  }, []);
  return null;
}


function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
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
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  loader: async ({ context }) => {
    try {
      const content = await context.queryClient.ensureQueryData(siteContentQuery());
      return { content };
    } catch (error) {
      console.error("[SEO] No fue posible cargar metadatos desde site_content:", error);
      return { content: {} as Record<string, string> };
    }
  },
  head: ({ loaderData }) => {
    const content = loaderData?.content ?? {};
    const siteName = content.site_name?.trim() || "Will Design 3D";
    const title = content.seo_title?.trim() || `${siteName} — Impresión 3D de gran formato en Bogotá`;
    const description = (
      content.seo_description?.trim() ||
      content.hero_subtitle?.trim() ||
      "Especialistas en impresión 3D de gran formato en Bogotá. Diseño, post-procesado, equipos e insumos y mantenimiento técnico."
    ).slice(0, 300);
    const logo = content.site_meta_thumbnail_url?.trim() ||
      "https://storage.googleapis.com/gpt-engineer-file-uploads/Hj8JfrWa2qQArO2BOXZdviQDjWA2/social-images/social-1783472807154-WILL_LOGO.webp";
    return {
      meta: [
        { charSet: "utf-8" },
        { name: "viewport", content: "width=device-width, initial-scale=1" },
        { title },
        { name: "description", content: description },
        { property: "og:site_name", content: siteName },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "website" },
        { property: "og:image", content: logo },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:title", content: title },
        { name: "twitter:description", content: description },
        { name: "twitter:image", content: logo },
      ],
      links: [
        { rel: "stylesheet", href: appCss },
        { rel: "icon", href: content.site_favicon_url?.trim() || "/favicon.ico" },
      ],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@graph": [
              {
                "@type": "Organization",
                "@id": `${SITE_URL}/#organization`,
                name: siteName,
                url: `${SITE_URL}/`,
                description,
                areaServed: "Bogotá, Colombia",
                sameAs: [content.contact_instagram_url || "https://www.instagram.com/will_design2020"],
              },
              {
                "@type": "WebSite",
                "@id": `${SITE_URL}/#website`,
                url: `${SITE_URL}/`,
                name: siteName,
                inLanguage: "es-CO",
                publisher: { "@id": `${SITE_URL}/#organization` },
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

  return (
    <QueryClientProvider client={queryClient}>
      <LegacyServiceWorkerCleanup />
      <ThemeApplier />
      <AuthProvider>
        <CartProvider>
          <div className="flex min-h-screen flex-col bg-background text-foreground">
            <LiveBanner />
            <SiteHeader />
            <main className="flex-1">
              {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
              <ErrorBoundary label="root_layout">
                <Outlet />
              </ErrorBoundary>
            </main>
            <SiteFooter />
            <KiaraWidget />
            <Toaster />
          </div>
        </CartProvider>
      </AuthProvider>

    </QueryClientProvider>
  );
}
