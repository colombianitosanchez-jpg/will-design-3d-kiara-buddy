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
  if (isVideoUrl(src)) {
    return thumb ? (
      <video src={`${src}#t=0.1`} muted playsInline preload="metadata" className={className} aria-label={alt} />
    ) : (
      <video src={src} autoPlay loop muted playsInline preload="metadata" className={className} aria-label={alt} />
    );
  }
  return <img src={src} alt={alt} className={className} loading="lazy" />;
}
