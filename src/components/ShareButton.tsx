import { Share2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export const DEFAULT_SHARE_TEXT = "Mira esto en Will Design 3D";

export function ShareButton({
  title,
  text,
  url,
  label,
  className = "",
}: {
  title: string;
  text?: string | null;
  url?: string;
  label?: string;
  className?: string;
}) {
  async function handleShare(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    const shareUrl = url ?? window.location.href;
    const shareText = text?.trim() || DEFAULT_SHARE_TEXT;

    if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
      try {
        await navigator.share({ title, text: shareText, url: shareUrl });
        return;
      } catch (err) {
        if ((err as DOMException)?.name === "AbortError") return;
      }
    }

    try {
      await navigator.clipboard.writeText(shareUrl);
      toast.success("¡Enlace copiado al portapapeles!");
    } catch {
      toast.error("No pudimos copiar el enlace");
    }
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size={label ? "sm" : "icon"}
      onClick={handleShare}
      aria-label={`Compartir ${title}`}
      title="Compartir"
      className={className}
    >
      <Share2 className="h-4 w-4" />
      {label}
    </Button>
  );
}
