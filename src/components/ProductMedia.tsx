import { useEffect, useRef, useState, type ReactNode } from "react";

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
  fallback,
}: {
  src: string;
  alt?: string;
  className?: string;
  /** Miniatura: video quieto sin reproducir para no gastar datos. */
  thumb?: boolean;
  /** Contenido alternativo si la imagen o el video fallan al cargar. */
  fallback?: ReactNode;
}) {
  const mediaRef = useRef<HTMLVideoElement | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const el = imgRef.current;
    if (!isVideoUrl(src) && el && el.complete && el.naturalWidth === 0) {
      setFailed(true);
    } else {
      setFailed(false);
    }
  }, [src]);

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

  if (failed && fallback !== undefined) {
    return <>{fallback}</>;
  }

  if (isVideoUrl(src)) {
    return thumb ? (
      <video
        src={`${src}#t=0.1`}
        muted
        playsInline
        preload="metadata"
        onError={() => setFailed(true)}
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
        onError={() => setFailed(true)}
        className={className}
        aria-label={alt}
        autoPlay={isVisible}
      />
    );
  }

  return (
    <img
      ref={imgRef}
      src={src}
      alt={alt}
      width={800}
      height={600}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={className}
      loading="lazy"
      decoding="async"
    />
  );
}
