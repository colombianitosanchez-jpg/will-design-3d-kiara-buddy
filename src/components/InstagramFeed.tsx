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

/** Quita espacios y el prefijo "elfsight-app-" (incluso repetido). */
export function sanitizeWidgetId(raw?: string | null): string {
  let id = (raw ?? "").trim();
  let prev = "";
  while (id !== prev) {
    prev = id;
    id = id.replace(/^elfsight-app-/, "").trim();
  }
  return id;
}

type ScriptStatus = "idle" | "loading" | "ready" | "error";

/**
 * Carga platform.js con defer y, en navegaciones cliente (cuando el script ya
 * existe), re-inicializa el widget para que vuelva a renderizarse.
 */
function useElfsightScript(enabled: boolean, widgetId: string): ScriptStatus {
  const [status, setStatus] = useState<ScriptStatus>("idle");

  useEffect(() => {
    if (!enabled || typeof document === "undefined") {
      setStatus("idle");
      return;
    }

    setStatus("loading");
    let cancelled = false;

    const retrigger = () => {
      try {
        window.eapps?.AppsManager?.initApps?.();
      } catch {
        /* ignore */
      }
    };

    const markReady = () => {
      if (!cancelled) setStatus("ready");
      retrigger();
    };

    const existing = document.querySelector<HTMLScriptElement>('script[data-elfsight="1"]');
    let script: HTMLScriptElement;

    if (existing) {
      script = existing;
      if (window.eapps) {
        markReady();
      } else {
        script.addEventListener("load", markReady);
        script.addEventListener("error", () => !cancelled && setStatus("error"));
      }
    } else {
      script = document.createElement("script");
      script.src = "https://static.elfsight.com/platform/platform.js";
      script.defer = true;
      script.dataset.elfsight = "1";
      script.addEventListener("load", markReady);
      script.addEventListener("error", () => !cancelled && setStatus("error"));
      document.body.appendChild(script);
    }

    // Reintento tardío + timeout de seguridad si el script nunca responde.
    const retryTimer = window.setTimeout(retrigger, 600);
    const failTimer = window.setTimeout(() => {
      if (!cancelled && !window.eapps) setStatus("error");
    }, 8000);

    return () => {
      cancelled = true;
      window.clearTimeout(retryTimer);
      window.clearTimeout(failTimer);
      script.removeEventListener("load", markReady);
    };
  }, [enabled, widgetId]);

  return status;
}

export type PortfolioPhoto = { id: string; url: string; is_visible: boolean };

function makeId(url: string, i: number) {
  return `${i}-${url.slice(-24)}`;
}

/** Acepta el formato nuevo ({id,url,is_visible}) y el antiguo (lista de URLs). */
export function parsePhotos(raw: string | undefined): PortfolioPhoto[] {
  if (!raw?.trim()) return [];
  const out: PortfolioPhoto[] = [];
  const push = (item: unknown, i: number) => {
    if (typeof item === "string" && item.trim()) {
      out.push({ id: makeId(item.trim(), i), url: item.trim(), is_visible: true });
    } else if (item && typeof item === "object") {
      const o = item as Record<string, unknown>;
      const url = typeof o.url === "string" ? o.url.trim() : "";
      if (!url) return;
      out.push({
        id: typeof o.id === "string" && o.id ? o.id : makeId(url, i),
        url,
        is_visible: o.is_visible !== false,
      });
    }
  };
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      parsed.forEach(push);
      return out;
    }
  } catch {
    /* también aceptamos lista separada por saltos de línea o comas */
  }
  raw
    .split(/[\n,]+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .forEach(push);
  return out;
}

/** Los interruptores del panel están activos por defecto cuando el valor está vacío. */
function isOn(value: string | undefined, defaultTrue = true): boolean {
  const v = (value ?? "").trim().toLowerCase();
  if (!v) return defaultTrue;
  return !["false", "0", "no", "off"].includes(v);
}

export function InstagramFeed() {
  const { data: content } = useQuery(siteContentQuery());
  const contact = getContactInfo(content);
  const handle = contact.instagram_handle.replace(/^@/, "");
  const instagramUrl = contact.instagram_url;

  const cleanWidgetId = sanitizeWidgetId(content?.elfsight_instagram_id || ENV_WIDGET_ID);
  const photos = parseImages(content?.portfolio_images);

  const showManual = isOn(content?.show_manual_gallery) && photos.length > 0;
  const wantsWidget = isOn(content?.show_instagram_widget) && cleanWidgetId.length > 0;

  const scriptStatus = useElfsightScript(wantsWidget, cleanWidgetId);
  const showWidget = wantsWidget && scriptStatus !== "error";

  const instagramFirst =
    (content?.portfolio_display_order ?? "").trim() === "instagram_first";

  const manualBlock = showManual ? (
    <ManualGallery key="manual" photos={photos} handle={handle} />
  ) : null;

  const widgetBlock = showWidget ? (
    <div key="instagram">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-xl">
          <span className="chip-teal">Portafolio en vivo</span>
          <h2 className="mt-3 text-3xl font-black sm:text-4xl md:text-5xl">
            Directo desde nuestro Instagram
          </h2>
          <p className="mt-3 text-muted-foreground">
            Las últimas publicaciones de{" "}
            <strong className="text-foreground">@{handle}</strong> — se actualizan
            automáticamente.
          </p>
        </div>
        <a href={instagramUrl} target="_blank" rel="noreferrer" className="btn-outline">
          <Instagram className="h-4 w-4" />@{handle}
        </a>
      </div>
      <div className="mt-10 min-h-[240px]">
        {scriptStatus === "ready" && (
          <div className={`elfsight-app-${cleanWidgetId}`} data-elfsight-app-lazy />
        )}
      </div>
    </div>
  ) : null;

  const blocks = instagramFirst ? [widgetBlock, manualBlock] : [manualBlock, widgetBlock];

  return (
    <section
      id="portafolio"
      className="border-y border-border"
      style={{ background: "color-mix(in oklab, var(--brand-teal) 6%, white)" }}
    >
      <div className="mx-auto max-w-7xl space-y-12 px-4 py-16 sm:px-6 md:py-24">
        {blocks}

        {!showManual && !showWidget && (
          <PortfolioTeaser instagramUrl={instagramUrl} handle={handle} />
        )}

        {/* Solo visible en desarrollo: nunca se muestra al público. */}
        {import.meta.env.DEV && !showManual && !showWidget && (
          <p className="rounded-2xl border border-dashed border-border bg-card p-4 text-xs text-muted-foreground">
            <strong>Nota de desarrollo (no visible en producción):</strong> activa los
            interruptores y sube fotos en Panel → Contenido → «Portafolio (Instagram)», o pega
            el ID del widget de Elfsight para activar el feed automático.
          </p>
        )}
      </div>
    </section>
  );
}

function ManualGallery({ photos, handle }: { photos: string[]; handle: string }) {
  return (
    <div>
      <div className="max-w-xl">
        <span className="chip-teal">Portafolio</span>
        <h2 className="mt-3 text-3xl font-black sm:text-4xl md:text-5xl">
          Piezas que hemos impreso
        </h2>
        <p className="mt-3 text-muted-foreground">
          Una selección de proyectos de impresión 3D de gran formato hechos en nuestro taller.
        </p>
      </div>
      <div className="mt-10">
        <PhotoGallery photos={photos} handle={handle} />
      </div>
    </div>
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
