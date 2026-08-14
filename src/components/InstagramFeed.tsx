import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Instagram, ImageIcon, X } from "lucide-react";
import { siteContentQuery, getContactInfo } from "@/lib/catalog";

// Fallback si aún no hay nada configurado en Panel → Contenido.
const ENV_WIDGET_ID = import.meta.env.VITE_ELFSIGHT_INSTAGRAM_ID as string | undefined;

declare global {
  interface Window {
    eapps?: { AppsManager?: { initApps?: () => void } };
  }
}

/**
 * Carga platform.js y, en navegaciones cliente (cuando el script ya existe),
 * re-inicializa el widget para que vuelva a renderizarse en cada montaje.
 */
function useElfsightScript(enabled: boolean, widgetId: string) {
  useEffect(() => {
    if (!enabled || typeof document === "undefined") return;

    const retrigger = () => {
      try {
        window.eapps?.AppsManager?.initApps?.();
      } catch {
        /* ignore */
      }
    };

    const existing = document.querySelector<HTMLScriptElement>('script[data-elfsight="1"]');
    if (existing) {
      // El script ya está en la página: forzamos la re-inicialización.
      retrigger();
      const t = window.setTimeout(retrigger, 400);
      return () => window.clearTimeout(t);
    }

    const s = document.createElement("script");
    s.src = "https://static.elfsight.com/platform/platform.js";
    s.async = true;
    s.dataset.elfsight = "1";
    s.addEventListener("load", retrigger);
    document.body.appendChild(s);
    return () => s.removeEventListener("load", retrigger);
  }, [enabled, widgetId]);
}

function parseImages(raw: string | undefined): string[] {
  if (!raw?.trim()) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed.filter((x) => typeof x === "string" && x.trim());
  } catch {
    /* también aceptamos lista separada por saltos de línea o comas */
  }
  return raw
    .split(/[\n,]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function InstagramFeed() {
  const { data: content } = useQuery(siteContentQuery());
  const contact = getContactInfo(content);
  const handle = contact.instagram_handle.replace(/^@/, "");
  const instagramUrl = contact.instagram_url;

  const widgetId = (content?.elfsight_instagram_id?.trim() || ENV_WIDGET_ID || "").trim();
  const photos = parseImages(content?.portfolio_images);

  useElfsightScript(Boolean(widgetId), widgetId);

  return (
    <section
      id="portafolio"
      className="border-y border-border"
      style={{ background: "color-mix(in oklab, var(--brand-teal) 6%, white)" }}
    >
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 md:py-24">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="max-w-xl">
            <span className="chip-teal">Portafolio en vivo</span>
            <h2 className="mt-3 text-3xl font-black sm:text-4xl md:text-5xl">
              Directo desde nuestro Instagram
            </h2>
            <p className="mt-3 text-muted-foreground">
              Las últimas publicaciones de{" "}
              <strong className="text-foreground">@{handle}</strong> — se
              actualizan automáticamente.
            </p>
          </div>
          <a href={instagramUrl} target="_blank" rel="noreferrer" className="btn-outline">
            <Instagram className="h-4 w-4" />@{handle}
          </a>
        </div>

        <div className="mt-10">
          {widgetId ? (
            <div className={`elfsight-app-${widgetId}`} data-elfsight-app-lazy />
          ) : photos.length > 0 ? (
            <PhotoGallery photos={photos} handle={handle} />
          ) : (
            <PortfolioTeaser instagramUrl={instagramUrl} handle={handle} />
          )}
        </div>

        {/* Solo visible en desarrollo: nunca se muestra al público. */}
        {import.meta.env.DEV && !widgetId && (
          <p className="mt-6 rounded-2xl border border-dashed border-border bg-card p-4 text-xs text-muted-foreground">
            <strong>Nota de desarrollo (no visible en producción):</strong> sube fotos en
            Panel → Contenido → «Fotos de portafolio», o pega el ID del widget de Elfsight
            en «ID del widget de Instagram (Elfsight)» para activar el feed automático.
          </p>
        )}
      </div>
    </section>
  );
}

function PhotoGallery({ photos, handle }: { photos: string[]; handle: string }) {
  const [zoom, setZoom] = useState<string | null>(null);
  return (
    <>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {photos.map((src, i) => (
          <button
            key={src + i}
            type="button"
            onClick={() => setZoom(src)}
            className="group relative aspect-square overflow-hidden rounded-2xl border border-border bg-card shadow-sm"
          >
            <img
              src={src}
              alt={`Proyecto de impresión 3D de Will Design 3D ${i + 1}`}
              loading="lazy"
              className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
            />
          </button>
        ))}
      </div>

      {zoom && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setZoom(null)}
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/80 p-4"
        >
          <button
            onClick={() => setZoom(null)}
            aria-label="Cerrar"
            className="absolute right-4 top-4 rounded-full bg-card p-2 shadow"
          >
            <X className="h-5 w-5" />
          </button>
          <img
            src={zoom}
            alt={`Proyecto de Will Design 3D — @${handle}`}
            className="max-h-[85vh] max-w-full rounded-2xl object-contain"
          />
        </div>
      )}
    </>
  );
}

function PortfolioTeaser({ instagramUrl, handle }: { instagramUrl: string; handle: string }) {
  return (
    <div className="rounded-3xl border border-border bg-card p-8 text-center shadow-sm">
      <div
        className="mx-auto grid h-14 w-14 place-items-center rounded-2xl"
        style={{
          background: "color-mix(in oklab, var(--brand-orange) 15%, white)",
          color: "var(--brand-orange)",
        }}
      >
        <ImageIcon className="h-7 w-7" />
      </div>
      <h3 className="mt-4 text-xl font-bold">Estamos preparando la galería</h3>
      <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
        Mientras tanto, mira nuestros proyectos más recientes de impresión 3D de gran
        formato directamente en Instagram.
      </p>
      <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
        <a href={instagramUrl} target="_blank" rel="noreferrer" className="btn-primary text-sm">
          <Instagram className="h-4 w-4" />
          Ver @{handle}
        </a>
      </div>
    </div>
  );
}
