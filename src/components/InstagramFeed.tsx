import { useEffect, useRef } from "react";
import { Instagram, ExternalLink } from "lucide-react";

const INSTAGRAM_HANDLE = "will_design2020";
const INSTAGRAM_URL = `https://www.instagram.com/${INSTAGRAM_HANDLE}/`;

// Set VITE_ELFSIGHT_INSTAGRAM_ID in your env once you create an Elfsight widget
// pointing to @will_design2020. Docs: https://elfsight.com/instagram-feed-instashow/
const ELFSIGHT_WIDGET_ID = import.meta.env.VITE_ELFSIGHT_INSTAGRAM_ID as
  | string
  | undefined;

function useElfsightScript(enabled: boolean) {
  const loaded = useRef(false);
  useEffect(() => {
    if (!enabled || loaded.current) return;
    if (document.querySelector('script[data-elfsight="1"]')) {
      loaded.current = true;
      return;
    }
    const s = document.createElement("script");
    s.src = "https://static.elfsight.com/platform/platform.js";
    s.async = true;
    s.dataset.elfsight = "1";
    document.body.appendChild(s);
    loaded.current = true;
  }, [enabled]);
}

export function InstagramFeed() {
  const hasWidget = Boolean(ELFSIGHT_WIDGET_ID);
  useElfsightScript(hasWidget);

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
              <strong className="text-foreground">@{INSTAGRAM_HANDLE}</strong> —
              se actualizan automáticamente.
            </p>
          </div>
          <a
            href={INSTAGRAM_URL}
            target="_blank"
            rel="noreferrer"
            className="btn-outline"
          >
            <Instagram className="h-4 w-4" />
            @{INSTAGRAM_HANDLE}
          </a>
        </div>

        <div className="mt-10">
          {hasWidget ? (
            <div
              className={`elfsight-app-${ELFSIGHT_WIDGET_ID}`}
              data-elfsight-app-lazy
            />
          ) : (
            <FeedPlaceholder />
          )}
        </div>
      </div>
    </section>
  );
}

function FeedPlaceholder() {
  return (
    <div className="rounded-3xl border-2 border-dashed border-border bg-card p-8 text-center">
      <Instagram
        className="mx-auto h-10 w-10"
        style={{ color: "var(--brand-orange)" }}
      />
      <h3 className="mt-4 text-lg font-bold">
        Conecta el feed automático de Instagram
      </h3>
      <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
        Este espacio mostrará automáticamente las publicaciones de{" "}
        <strong>@{INSTAGRAM_HANDLE}</strong>. Crea un widget gratuito en
        Elfsight, cópialo y guárdalo como variable{" "}
        <code className="rounded bg-muted px-1 py-0.5 text-xs">
          VITE_ELFSIGHT_INSTAGRAM_ID
        </code>
        .
      </p>
      <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
        <a
          href="https://elfsight.com/instagram-feed-instashow/"
          target="_blank"
          rel="noreferrer"
          className="btn-primary text-sm"
        >
          Crear widget Elfsight
          <ExternalLink className="h-4 w-4" />
        </a>
        <a
          href={INSTAGRAM_URL}
          target="_blank"
          rel="noreferrer"
          className="btn-outline text-sm"
        >
          Ver Instagram
          <Instagram className="h-4 w-4" />
        </a>
      </div>
    </div>
  );
}
