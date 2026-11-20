import { useEffect, useRef, useState } from "react";
import type { AmbientEffectType } from "@/lib/theme";

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

export function AmbientBackdrop({
  effect,
  intensity = 55,
}: {
  effect?: AmbientEffectType;
  intensity?: number;
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || !effect || effect === "none") {
    return null;
  }

  const normalizedIntensity = Math.max(10, Math.min(100, Math.round(intensity)));
  const opacityFactor = normalizedIntensity / 100;

  if (effect === "snow") {
    return <SnowCanvas intensity={normalizedIntensity} />;
  }

  if (effect === "grid") {
    return (
      <div
        aria-hidden="true"
        className="ambient-grid pointer-events-none fixed inset-0 z-0 overflow-hidden"
        style={{ opacity: Math.min(0.42, 0.12 + opacityFactor * 0.3) }}
      />
    );
  }

  return (
    <div
      aria-hidden="true"
      className="ambient-aurora pointer-events-none fixed inset-0 z-0 overflow-hidden"
      style={{ opacity: Math.min(0.45, 0.14 + opacityFactor * 0.3) }}
    >
      <div className="ambient-aurora-blob ambient-aurora-blob-1" />
      <div className="ambient-aurora-blob ambient-aurora-blob-2" />
    </div>
  );
}
