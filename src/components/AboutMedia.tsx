import { useState, useEffect, type LucideIcon } from "react";
import Lottie from "lottie-react";

interface AboutMediaProps {
  src?: string;
  alt?: string;
  className?: string;
  fallbackIcon?: LucideIcon;
  fallbackIconClassName?: string;
  fallbackLogoUrl?: string;
}

export function AboutMedia({
  src,
  alt = "",
  className = "h-full w-full object-cover",
  fallbackIcon: FallbackIcon,
  fallbackIconClassName = "h-6 w-6",
  fallbackLogoUrl = "/logo.png",
}: AboutMediaProps) {
  const [hasError, setHasError] = useState(false);
  const [lottieData, setLottieData] = useState<any>(null);

  const cleanSrc = src?.trim() || "";
  const isVideo = /\.(mp4|webm|quicktime)($|\?)/i.test(cleanSrc);
  const isLottie = /\.json($|\?)/i.test(cleanSrc);

  useEffect(() => {
    setHasError(false);
    setLottieData(null);

    if (isLottie && cleanSrc) {
      let isMounted = true;
      fetch(cleanSrc)
        .then((res) => {
          if (!res.ok) throw new Error("Failed to load Lottie JSON");
          return res.json();
        })
        .then((json) => {
          if (isMounted) setLottieData(json);
        })
        .catch(() => {
          if (isMounted) setHasError(true);
        });
      return () => {
        isMounted = false;
      };
    }
  }, [cleanSrc, isLottie]);

  if (!cleanSrc || hasError) {
    if (FallbackIcon) {
      return <FallbackIcon className={fallbackIconClassName} />;
    }
    return (
      <img
        src={fallbackLogoUrl}
        alt={alt || "Will Design 3D"}
        className={className}
      />
    );
  }

  if (isVideo) {
    return (
      <video
        src={cleanSrc}
        autoPlay
        loop
        muted
        playsInline
        onError={() => setHasError(true)}
        className={className}
      />
    );
  }

  if (isLottie) {
    if (!lottieData) {
      if (FallbackIcon) return <FallbackIcon className={fallbackIconClassName} />;
      return <img src={fallbackLogoUrl} alt={alt || "Will Design 3D"} className={className} />;
    }
    return <Lottie animationData={lottieData} loop={true} className={className} />;
  }

  return (
    <img
      src={cleanSrc}
      alt={alt}
      onError={() => setHasError(true)}
      className={className}
    />
  );
}
