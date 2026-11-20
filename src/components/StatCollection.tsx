import { useRouter } from "@tanstack/react-router";
import { UnifiedButton } from "@/components/UnifiedButton";
import { useSiteContent } from "@/hooks/use-site-content";
import { getActiveTheme } from "@/lib/theme";
import { contrastText, parseStatItems, statShareKey, type StatCollectionKey } from "@/lib/hero-stats";
import { getContactInfo, pickWhatsapp, waLink } from "@/lib/catalog";
import { getWhatsAppPayloadForButton } from "@/lib/whatsapp-buttons";
import { openExternalUrl } from "@/lib/whatsapp";
import { toast } from "sonner";

/** One renderer for all independent About collections: no invisible editor options. */
export function StatCollection({ collection }: { collection: StatCollectionKey }) {
  const { content } = useSiteContent();
  const router = useRouter();
  const palette = getActiveTheme(content).colors.palette || [];
  const items = parseStatItems(content[collection]);
  if (!items.some(item => item.k || item.v)) return null;

  return <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
    {items.map((item, index) => {
      if (!item.k && !item.v) return null;
      const color = item.custom_hex || palette.find(color => color.id === item.color_id)?.hex;
      const clickable = Boolean(item.action_type && item.action_type !== "none");
      function act() {
        if (item.action_type === "whatsapp") {
          const payload = getWhatsAppPayloadForButton({ ...item, whatsapp_image_key: statShareKey(collection, index) }, undefined, undefined, `Hola, me interesa ${item.k}.`, content.whatsapp_default_message, content);
          const url = waLink(pickWhatsapp(item.action_value, getContactInfo(content).whatsapp), payload.formattedText);
          if (!url) { toast.error("Configura WhatsApp en /panel/marca"); return; }
          openExternalUrl(url);
        } else {
          const target = item.action_type === "cotizador" ? "/cotizador" : item.action_value?.trim();
          if (!target) return;
          if (/^https?:\/\//i.test(target)) openExternalUrl(target);
          else router.navigate({ to: target.startsWith("/") ? target : `/${target}` });
        }
      }
      // UnifiedButton supplies the exact same visual layers as the Hero buttons.
      // Its content is replaced only for the two-field card; actions run once.
      return <div key={item.id} className={`relative ${item.width === "full" ? "col-span-full" : ""}`}>
        <UnifiedButton button={{ ...item, id: item.id, text: [item.k, item.v].filter(Boolean).join(" — "), action_type: "link", action_value: "", whatsapp_message: item.whatsapp_message || "", variant: "default", custom_hex: color, text_color: item.text_color || (item.media_mode === "fill" && item.media_url ? undefined : color ? contrastText(color) : undefined), width: "full", position: "center" }} styleOverride={{ rounded: item.rounded?.replace("rounded-", "") as "xl" | "2xl" | "3xl" | "full" }} interactive={clickable} onClick={act} className={`min-h-20 w-full ${clickable ? "" : "cursor-default"}`}>
          <span className="flex min-w-0 flex-col gap-1 whitespace-normal break-words">
            <span className="text-lg font-bold">{item.k}</span>
            {item.v && <span className="text-xs font-medium">{item.v}</span>}
          </span>
        </UnifiedButton>
      </div>;
    })}
  </div>;
}