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
    const siteContent = await context.queryClient.fetchQuery(siteContentQuery());
    return { siteContent };
  },
  head: ({ loaderData }: any) => {
    const siteContent = loaderData?.siteContent;
    const title = siteContent?.site_title || "Will Design 3D — Taller de Impresión 3D y Servicios en Bogotá";
    const desc = siteContent?.site_description || "Taller de impresión 3D en Bogotá: diseño, prototipado, post-procesado, venta de equipos e insumos y mantenimiento técnico.";
    const image = siteContent?.site_meta_thumbnail_url || "https://storage.googleapis.com/gpt-engineer-file-uploads/Hj8JfrWa2qQArO2BOXZdviQDjWA2/social-images/social-1783472807154-WILL_LOGO.webp";
    const favicon = siteContent?.site_favicon_url || "/favicon.ico";
    const businessName = siteContent?.site_business_name || "Will Design 3D";
    const areaServed = siteContent?.site_area_served || "Bogotá, Colombia";

    return {
      meta: [
        { charSet: "utf-8" },
        { name: "viewport", content: "width=device-width, initial-scale=1" },
        { title },
        { name: "description", content: desc },
        { property: "og:title", content: title },
        { property: "og:description", content: desc },
        { property: "og:type", content: "website" },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:title", content: title },
        { name: "twitter:description", content: desc },
        { property: "og:image", content: image },
        { name: "twitter:image", content: image },
      ],
      links: [
        { rel: "stylesheet", href: appCss },
        { rel: "icon", href: favicon, type: "image/x-icon" },
      ],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@graph": [
              {
                "@type": "Organization",
                "@id": "https://will-design-3d.lovable.app/#organization",
                name: businessName,
                url: "https://will-design-3d.lovable.app/",
                description: desc,
                areaServed: areaServed,
                sameAs: ["https://www.instagram.com/will_design2020"],
              },
              {
                "@type": "WebSite",
                "@id": "https://will-design-3d.lovable.app/#website",
                url: "https://will-design-3d.lovable.app/",
                name: businessName,
                inLanguage: "es-CO",
                publisher: { "@id": "https://will-design-3d.lovable.app/#organization" },
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
