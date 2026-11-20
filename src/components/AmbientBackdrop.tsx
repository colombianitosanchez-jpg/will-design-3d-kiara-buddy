import { useEffect, useRef, useState } from "react";
import {
  clampOverlayOpacity,
  type AmbientEffectType,
  type ThemeBackground,
} from "@/lib/theme";

type SnowFlake = {
  x: number;
  y: number;
  r: number;
  vy: number;
  vx: number;
  alpha: number;
};

function SnowCanvas({ intensity }: { intensity: number }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let rafId = 0;
    let width = window.innerWidth;
    let height = window.innerHeight;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const resize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    const count = Math.max(18, Math.min(110, Math.round((intensity / 100) * 95)));
    const flakes: SnowFlake[] = Array.from({ length: count }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      r: 1.5 + Math.random() * 2.8,
      vy: 0.45 + Math.random() * 1.15,
      vx: (Math.random() - 0.5) * 0.45,
      alpha: 0.35 + Math.random() * 0.5,
    }));

    const tick = () => {
      if (document.hidden) {
        rafId = window.requestAnimationFrame(tick);
        return;
      }

      ctx.clearRect(0, 0, width, height);
      for (const f of flakes) {
        f.y += f.vy;
        f.x += f.vx + Math.sin(f.y * 0.015) * 0.25;
        if (f.y > height + 8) {
          f.y = -8;
          f.x = Math.random() * width;
        }
        if (f.x > width + 8) f.x = -8;
        if (f.x < -8) f.x = width + 8;

        ctx.beginPath();
        ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${f.alpha})`;
        ctx.shadowColor = "rgba(148, 163, 184, 0.35)";
        ctx.shadowBlur = 3;
        ctx.fill();
      }
      ctx.shadowBlur = 0;
      rafId = window.requestAnimationFrame(tick);
    };

    rafId = window.requestAnimationFrame(tick);

    return () => {
      window.cancelAnimationFrame(rafId);
      window.removeEventListener("resize", resize);
    };
  }, [intensity]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-30 h-full w-full"
    />
  );
}

function MultimediaBackgroundLayer({ background }: { background: ThemeBackground }) {
  const [mediaFailed, setMediaFailed] = useState(false);
  const mediaUrl = background.mediaUrl?.trim();

  useEffect(() => {
    setMediaFailed(false);
  }, [mediaUrl]);

  if (!mediaUrl || background.type === "solid" || mediaFailed) {
    return null;
  }

  const fit = background.fit ?? (background.type === "pattern" ? "repeat" : "cover");
  const isVideo =
    background.type === "video" || /\.(mp4|webm|mov)(\?|$)/i.test(mediaUrl);
  const isRepeat = background.type === "pattern" || fit === "repeat";
  const fitClass = fit === "contain" ? "object-contain" : "object-cover";
  const overlayOpacity = clampOverlayOpacity(background.overlayOpacity, 45) / 100;
  const overlayColor = background.overlayColor?.trim() || "#000000";

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
    >
      {isVideo ? (
        <video
          src={mediaUrl}
          autoPlay
          loop
          muted
          playsInline
          onError={() => setMediaFailed(true)}
          className={`h-full w-full object-center ${fitClass}`}
        />
      ) : isRepeat ? (
        <div
          className="h-full w-full"
          style={{
            backgroundImage: `url("${mediaUrl}")`,
            backgroundRepeat: "repeat",
            backgroundPosition: "center",
          }}
        />
      ) : (
        <img
          src={mediaUrl}
          alt=""
          decoding="async"
          onError={() => setMediaFailed(true)}
          className={`h-full w-full object-center ${fitClass}`}
        />
      )}

      {overlayOpacity > 0 && (
        <div
          className="pointer-events-none absolute inset-0 transition-opacity"
          style={{
            backgroundColor: overlayColor,
            opacity: overlayOpacity,
          }}
        />
      )}
    </div>
  );
}

export function AmbientBackdrop({
  background,
  effect,
  intensity = 55,
}: {
  background?: ThemeBackground;
  effect?: AmbientEffectType;
  intensity?: number;
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  const hasMediaBackground = Boolean(
    background && background.type !== "solid" && background.mediaUrl?.trim(),
  );
  const hasAmbientEffect = Boolean(effect && effect !== "none");

  if (!hasMediaBackground && !hasAmbientEffect) {
    return null;
  }

  const normalizedIntensity = Math.max(10, Math.min(100, Math.round(intensity)));
  const opacityFactor = normalizedIntensity / 100;

  return (
    <>
      {hasMediaBackground && background && (
        <MultimediaBackgroundLayer background={background} />
      )}

      {effect === "snow" && <SnowCanvas intensity={normalizedIntensity} />}

      {effect === "grid" && (
        <div
          aria-hidden="true"
          className="ambient-grid pointer-events-none fixed inset-0 z-0 overflow-hidden"
          style={{ opacity: Math.min(0.42, 0.12 + opacityFactor * 0.3) }}
        />
      )}

      {effect === "aurora" && (
        <div
          aria-hidden="true"
          className="ambient-aurora pointer-events-none fixed inset-0 z-0 overflow-hidden"
          style={{ opacity: Math.min(0.45, 0.14 + opacityFactor * 0.3) }}
        >
          <div className="ambient-aurora-blob ambient-aurora-blob-1" />
          <div className="ambient-aurora-blob ambient-aurora-blob-2" />
        </div>
      )}
    </>
  );
}
