import { parseStatItems, type StatCollectionKey } from "@/lib/hero-stats";

export type AboutBlockId =
  | "story"
  | "stats"
  | "mission"
  | "vision"
  | "values"
  | "kiara"
  | "workshop";

export type AboutBlockIcon =
  | "book"
  | "trophy"
  | "target"
  | "compass"
  | "heart"
  | "paw"
  | "factory";

export type AboutBlockDef = {
  id: AboutBlockId;
  title: string;
  subtitle: string;
  icon: AboutBlockIcon;
  fieldKeys: readonly string[];
  checkKeys: readonly string[];
  collectionKey?: StatCollectionKey;
};

export const ABOUT_BLOCKS: readonly AboutBlockDef[] = [
  {
    id: "story",
    title: "Historia y Presentación Principal",
    subtitle: "Etiqueta, título, textos de inicio y /nosotros, multimedia y botones de acción.",
    icon: "book",
    fieldKeys: [
      "about_chip",
      "about_title",
      "about_subtitle",
      "about_short",
      "about_long",
      "about_image_url",
      "about_buttons",
    ],
    checkKeys: [
      "about_chip",
      "about_title",
      "about_subtitle",
      "about_short",
      "about_long",
      "about_image_url",
      "about_buttons",
      "about_cta_text",
      "about_cta_url",
      "about_cta_media_url",
      "about_cta_icon_url",
      "about_cta_custom_hex",
      "about_cta_text_color",
      "about_cta_whatsapp_message",
      "about_cta_whatsapp_image_url",
    ],
  },
  {
    id: "stats",
    title: "Métricas y Logros Destacados",
    subtitle: "Tarjetas numéricas y logros ordenables mediante arrastrar y soltar.",
    icon: "trophy",
    fieldKeys: ["about_stats"],
    checkKeys: [],
    collectionKey: "about_stats",
  },
  {
    id: "mission",
    title: "Misión",
    subtitle: "Propósito del taller, multimedia animada y botón de acción.",
    icon: "target",
    fieldKeys: [
      "about_mission_title",
      "about_mission_text",
      "about_mission_image_url",
      "about_mission_cta_text",
    ],
    checkKeys: [
      "about_mission_title",
      "about_mission_text",
      "about_mission_image_url",
      "about_mission_cta_text",
      "about_mission_cta_url",
      "about_mission_cta_media_url",
      "about_mission_cta_icon_url",
      "about_mission_cta_custom_hex",
      "about_mission_cta_text_color",
      "about_mission_cta_whatsapp_message",
      "about_mission_cta_whatsapp_image_url",
    ],
  },
  {
    id: "vision",
    title: "Visión",
    subtitle: "Proyección futura en impresión 3D, multimedia y botón de acción.",
    icon: "compass",
    fieldKeys: [
      "about_vision_title",
      "about_vision_text",
      "about_vision_image_url",
      "about_vision_cta_text",
    ],
    checkKeys: [
      "about_vision_title",
      "about_vision_text",
      "about_vision_image_url",
      "about_vision_cta_text",
      "about_vision_cta_url",
      "about_vision_cta_media_url",
      "about_vision_cta_icon_url",
      "about_vision_cta_custom_hex",
      "about_vision_cta_text_color",
      "about_vision_cta_whatsapp_message",
      "about_vision_cta_whatsapp_image_url",
    ],
  },
  {
    id: "values",
    title: "Nuestros Valores",
    subtitle: "Título, introducción, lista ordenable de valores, ilustración y botón.",
    icon: "heart",
    fieldKeys: [
      "about_values_title",
      "about_values_text",
      "about_values_items",
      "about_values_image_url",
      "about_values_cta_text",
    ],
    checkKeys: [
      "about_values_title",
      "about_values_text",
      "about_values_image_url",
      "about_values_cta_text",
      "about_values_cta_url",
      "about_values_cta_media_url",
      "about_values_cta_icon_url",
      "about_values_cta_custom_hex",
      "about_values_cta_text_color",
      "about_values_cta_whatsapp_message",
      "about_values_cta_whatsapp_image_url",
    ],
    collectionKey: "about_values_items",
  },
  {
    id: "kiara",
    title: "Kiara (Directora de Operaciones)",
    subtitle: "Título, cargo, historia, multimedia y botón de acción de Kiara.",
    icon: "paw",
    fieldKeys: [
      "about_kiara_title",
      "about_kiara_subtitle",
      "about_kiara_text",
      "about_kiara_image_url",
      "about_kiara_cta_text",
    ],
    checkKeys: [
      "about_kiara_title",
      "about_kiara_subtitle",
      "about_kiara_text",
      "about_kiara_image_url",
      "about_kiara_cta_text",
      "about_kiara_cta_url",
      "about_kiara_cta_media_url",
      "about_kiara_cta_icon_url",
      "about_kiara_cta_custom_hex",
      "about_kiara_cta_text_color",
      "about_kiara_cta_whatsapp_message",
      "about_kiara_cta_whatsapp_image_url",
    ],
  },
  {
    id: "workshop",
    title: "Taller y Equipamiento",
    subtitle: "Capacidades técnicas, máquinas ordenables, foto o video, dirección y botón.",
    icon: "factory",
    fieldKeys: [
      "about_workshop_title",
      "about_workshop_text",
      "about_workshop_items",
      "about_workshop_image_url",
      "about_workshop_address",
      "about_workshop_cta_text",
    ],
    checkKeys: [
      "about_workshop_title",
      "about_workshop_text",
      "about_workshop_image_url",
      "about_workshop_address",
      "about_workshop_cta_text",
      "about_workshop_cta_url",
      "about_workshop_cta_media_url",
      "about_workshop_cta_icon_url",
      "about_workshop_cta_custom_hex",
      "about_workshop_cta_text_color",
      "about_workshop_cta_whatsapp_message",
      "about_workshop_cta_whatsapp_image_url",
    ],
    collectionKey: "about_workshop_items",
  },
];

export type AboutBlockStatus = {
  id: AboutBlockId;
  title: string;
  isCustomized: boolean;
  filledCount: number;
  itemCount: number;
};

export type AboutBlocksSummary = {
  customizedCount: number;
  totalCount: number;
  blocks: AboutBlockStatus[];
};

export function getAboutBlockStatus(
  block: AboutBlockDef,
  values: Record<string, string | undefined>,
): AboutBlockStatus {
  const filledKeys = block.checkKeys.filter((k) => {
    const raw = values[k]?.trim();
    if (!raw) return false;
    if (k === "about_buttons" && raw === "[]") return false;
    return true;
  }).length;
  const items = block.collectionKey
    ? parseStatItems(values[block.collectionKey]).filter(
        (it) => Boolean(it.k?.trim() || it.v?.trim()),
      )
    : [];
  const itemCount = items.length;
  const filledCount = filledKeys + (itemCount > 0 ? 1 : 0);

  return {
    id: block.id,
    title: block.title,
    isCustomized: filledCount > 0,
    filledCount,
    itemCount,
  };
}

export function getAboutBlocksSummary(
  values: Record<string, string | undefined>,
): AboutBlocksSummary {
  const blocks = ABOUT_BLOCKS.map((block) => getAboutBlockStatus(block, values));
  return {
    customizedCount: blocks.filter((b) => b.isCustomized).length,
    totalCount: blocks.length,
    blocks,
  };
}
