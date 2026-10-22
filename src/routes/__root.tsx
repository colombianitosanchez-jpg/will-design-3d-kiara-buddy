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
import { getActiveTheme, applyThemeToDocument } from "../lib/theme";
import { getSeo } from "../lib/seo";

function ThemeApplier() {
  const { data: content } = useQuery(siteContentQuery());
  useEffect(() => {
    const activeTheme = getActiveTheme(content);
    applyThemeToDocument(activeTheme);
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
    const [siteContent, menuItems, categories, siteServices] = await Promise.all([
      context.queryClient.ensureQueryData(siteContentQuery()),
      context.queryClient.ensureQueryData(menuItemsQuery()),
      context.queryClient.ensureQueryData(categoriesQuery()),
      context.queryClient.ensureQueryData(siteServicesQuery()),
    ]);
    return { siteContent, menuItems, categories, siteServices };
  },
  head: ({ loaderData }: any) => {
    const siteContent = loaderData?.siteContent;
    const seo = getSeo(null, siteContent);
    const favicon = siteContent?.site_favicon_url || "/favicon.ico";
    const businessName = siteContent?.site_business_name || "Will Design 3D";
    const areaServed = siteContent?.site_area_served || "";
    const instagramUrl = siteContent?.contact_instagram_url || "https://www.instagram.com/will_design2020";

    const title = seo.title;
    const desc = seo.description;
    const image = seo.image;

    const metaTags: Array<Record<string, string>> = [
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
    ];

    if (image) {
      metaTags.push(
        { property: "og:image", content: image },
        { name: "twitter:image", content: image }
      );
    }

    return {
      meta: metaTags,
      links: [
        { rel: "stylesheet", href: appCss },
        { rel: "icon", href: favicon },
        { rel: "shortcut icon", href: favicon },
        { rel: "apple-touch-icon", href: favicon },
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
                sameAs: [instagramUrl],
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
