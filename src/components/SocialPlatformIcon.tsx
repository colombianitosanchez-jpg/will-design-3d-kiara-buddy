import {
  Facebook,
  Globe,
  Instagram,
  Linkedin,
  Youtube,
} from "lucide-react";
import type { SocialPlatform } from "@/lib/contact-config";

export const SOCIAL_PLATFORM_LABELS: Record<SocialPlatform, string> = {
  instagram: "Instagram",
  tiktok: "TikTok",
  youtube: "YouTube",
  facebook: "Facebook",
  x: "X (Twitter)",
  linkedin: "LinkedIn",
  pinterest: "Pinterest",
  custom: "Enlace personalizado",
};

export function SocialPlatformIcon({
  platform,
  className = "h-5 w-5",
}: {
  platform: SocialPlatform;
  className?: string;
}) {
  switch (platform) {
    case "instagram":
      return <Instagram className={className} aria-hidden="true" />;
    case "youtube":
      return <Youtube className={className} aria-hidden="true" />;
    case "facebook":
      return <Facebook className={className} aria-hidden="true" />;
    case "linkedin":
      return <Linkedin className={className} aria-hidden="true" />;
    case "tiktok":
      return (
        <svg
          viewBox="0 0 24 24"
          fill="currentColor"
          className={className}
          aria-hidden="true"
        >
          <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1v-3.5a6.37 6.37 0 0 0-.79-.05A6.34 6.34 0 0 0 3.15 15.2a6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.34-6.34V8.73a8.19 8.19 0 0 0 4.76 1.52V6.8a4.82 4.82 0 0 1-1-.11Z" />
        </svg>
      );
    case "x":
      return (
        <svg
          viewBox="0 0 24 24"
          fill="currentColor"
          className={className}
          aria-hidden="true"
        >
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
      );
    case "pinterest":
      return (
        <svg
          viewBox="0 0 24 24"
          fill="currentColor"
          className={className}
          aria-hidden="true"
        >
          <path d="M12.017 2C6.486 2 2 6.486 2 12.017c0 4.242 2.636 7.868 6.357 9.33-.088-.792-.167-2.009.035-2.874.182-.781 1.174-4.977 1.174-4.977s-.299-.599-.299-1.484c0-1.391.806-2.43 1.809-2.43.853 0 1.265.641 1.265 1.409 0 .858-.546 2.142-.828 3.332-.236.996.499 1.808 1.48 1.808 1.777 0 3.143-1.874 3.143-4.578 0-2.393-1.72-4.066-4.176-4.066-2.845 0-4.515 2.134-4.515 4.34 0 .86.331 1.782.744 2.283.082.099.094.186.069.287-.076.314-.245.996-.278 1.135-.044.183-.145.222-.334.134-1.249-.581-2.03-2.407-2.03-3.874 0-3.154 2.292-6.052 6.608-6.052 3.469 0 6.165 2.473 6.165 5.776 0 3.447-2.173 6.22-5.19 6.22-1.013 0-1.966-.527-2.292-1.148l-.623 2.378c-.226.869-.835 1.958-1.244 2.621.937.29 1.931.446 2.962.446 5.531 0 10.017-4.486 10.017-10.017C22.034 6.486 17.548 2 12.017 2z" />
        </svg>
      );
    case "custom":
    default:
      return <Globe className={className} aria-hidden="true" />;
  }
}
