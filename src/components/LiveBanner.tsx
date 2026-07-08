import { Radio } from "lucide-react";
import { useLive } from "@/lib/live-store";

export function LiveBanner() {
  const { isLive, platform, url } = useLive();
  if (!isLive) return null;

  return (
    <a
      href={url || "#"}
      target="_blank"
      rel="noreferrer"
      className="block w-full text-white shadow-md"
      style={{
        background:
          "linear-gradient(90deg, #dc2626, var(--brand-orange, #ea580c))",
      }}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-center gap-3 px-4 py-2 text-sm font-bold sm:text-base">
        <span className="relative flex h-3 w-3">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75" />
          <span className="relative inline-flex h-3 w-3 rounded-full bg-white" />
        </span>
        <Radio className="h-4 w-4" aria-hidden />
        <span>
          ¡Estamos <span className="underline">EN VIVO</span> en {platform}!
          <span className="ml-2 hidden sm:inline">
            Haz clic aquí para unirte →
          </span>
        </span>
      </div>
    </a>
  );
}
