import { parseStatItems, type StatCollectionKey } from "./hero-stats";

export function resolveStatShareImage(key: string, content: Record<string, string>): string | undefined {
  const match = /^(s|stat|a|v|t)(\d+)$/i.exec(key);
  if (match) {
    const collections: Record<string, StatCollectionKey> = { s: "hero_stats", stat: "hero_stats", a: "about_stats", v: "about_values_items", t: "about_workshop_items" };
    const items = parseStatItems(content[collections[match[1].toLowerCase()]]);
    return items[Number(match[2]) - 1]?.whatsapp_image_url?.trim() || "";
  }
  // Old unscoped IDs belong to Hero only; never search unrelated collections.
  if (/^stat_[a-z0-9_]+$/i.test(key)) {
    return parseStatItems(content.hero_stats).find(item => item.id.toLowerCase() === key.toLowerCase())?.whatsapp_image_url?.trim() || "";
  }
  return undefined;
}