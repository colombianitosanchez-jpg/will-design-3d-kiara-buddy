import { useEffect, useRef, useState } from "react";

const VIDEO_EXT = /\.(mp4|webm|mov|m4v|ogv)(\?|#|$)/i;

/** Detecta si una URL de galería apunta a un video corto. */
export function isVideoUrl(url: string | null | undefined): boolean {
  return !!url && VIDEO_EXT.test(url);
}

/** Muestra una foto o un video corto (en bucle, silenciado) según la URL. */
export function ProductMedia({
  src,
  alt = "",
  className,
  thumb = false,
}: {
  src: string;
  alt?: string;
  className?: string;
  /** Miniatura: video quieto sin reproducir para no gastar datos. */
  thumb?: boolean;
}) {
  const mediaRef = useRef<HTMLVideoElement | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (!isVideoUrl(src) || thumb) return;
    const el = mediaRef.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      setIsVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsVisible(true);
            el.play().catch(() => {});
          } else {
            el.pause();
          }
        });
      },
      { threshold: 0.15 },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [src, thumb]);

  if (isVideoUrl(src)) {
    return thumb ? (
      <video
        src={`${src}#t=0.1`}
        muted
        playsInline
        preload="metadata"
        className={className}
        aria-label={alt}
      />
    ) : (
      <video
        ref={mediaRef}
        src={src}
        loop
        muted
        playsInline
        preload="metadata"
        className={className}
        aria-label={alt}
        autoPlay={isVisible}
      />
    );
  }

  return <img src={src} alt={alt} className={className} loading="lazy" decoding="async" />;
}
