export type ContactBlockKey = "canales" | "mapa" | "redes" | "formulario";

export const DEFAULT_CONTACT_BLOCKS_ORDER: ContactBlockKey[] = [
  "canales",
  "mapa",
  "redes",
  "formulario",
];

const VALID_CONTACT_BLOCK_SET = new Set<ContactBlockKey>(DEFAULT_CONTACT_BLOCKS_ORDER);

export type ContactChannelType = "whatsapp" | "phone" | "email";

export type ContactChannel = {
  id: string;
  type: ContactChannelType;
  label: string;
  value: string;
  displayValue?: string;
  isPrimaryOrder?: boolean;
};

export type SocialPlatform =
  | "instagram"
  | "tiktok"
  | "youtube"
  | "facebook"
  | "x"
  | "linkedin"
  | "pinterest"
  | "custom";

const VALID_SOCIAL_PLATFORMS = new Set<SocialPlatform>([
  "instagram",
  "tiktok",
  "youtube",
  "facebook",
  "x",
  "linkedin",
  "pinterest",
  "custom",
]);

export type ContactSocialLink = {
  id: string;
  platform: SocialPlatform;
  label: string;
  url: string;
};

export function parseContactBlocksOrder(raw?: string | null): ContactBlockKey[] {
  if (!raw || typeof raw !== "string" || !raw.trim()) {
    return [...DEFAULT_CONTACT_BLOCKS_ORDER];
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [...DEFAULT_CONTACT_BLOCKS_ORDER];
    const seen = new Set<ContactBlockKey>();
    const result: ContactBlockKey[] = [];
    for (const item of parsed) {
      if (typeof item === "string" && VALID_CONTACT_BLOCK_SET.has(item as ContactBlockKey)) {
        const key = item as ContactBlockKey;
        if (!seen.has(key)) {
          seen.add(key);
          result.push(key);
        }
      }
    }
    for (const fallback of DEFAULT_CONTACT_BLOCKS_ORDER) {
      if (!seen.has(fallback)) {
        seen.add(fallback);
        result.push(fallback);
      }
    }
    return result;
  } catch {
    return [...DEFAULT_CONTACT_BLOCKS_ORDER];
  }
}

export function serializeContactBlocksOrder(order: ContactBlockKey[]): string {
  const seen = new Set<ContactBlockKey>();
  const clean: ContactBlockKey[] = [];
  for (const item of order) {
    if (VALID_CONTACT_BLOCK_SET.has(item) && !seen.has(item)) {
      seen.add(item);
      clean.push(item);
    }
  }
  for (const fallback of DEFAULT_CONTACT_BLOCKS_ORDER) {
    if (!seen.has(fallback)) {
      seen.add(fallback);
      clean.push(fallback);
    }
  }
  return JSON.stringify(clean);
}

function buildLegacyChannels(legacyContent?: Record<string, string> | null): ContactChannel[] {
  if (!legacyContent) return [];
  const channels: ContactChannel[] = [];
  const wa = legacyContent.contact_whatsapp?.trim() || "";
  const waDisplay = legacyContent.contact_whatsapp_display?.trim() || "";
  if (wa || waDisplay) {
    channels.push({
      id: "legacy-whatsapp",
      type: "whatsapp",
      label: "WhatsApp",
      value: wa || waDisplay.replace(/\D/g, ""),
      displayValue: waDisplay || wa,
      isPrimaryOrder: true,
    });
  }
  const email = legacyContent.contact_email?.trim() || "";
  if (email) {
    channels.push({
      id: "legacy-email",
      type: "email",
      label: "Correo",
      value: email,
      displayValue: email,
    });
  }
  return channels;
}

export function parseContactChannels(
  raw?: string | null,
  legacyContent?: Record<string, string> | null,
): ContactChannel[] {
  if (!raw || typeof raw !== "string" || !raw.trim()) {
    return buildLegacyChannels(legacyContent);
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return buildLegacyChannels(legacyContent);
    }
    const valid: ContactChannel[] = [];
    for (let i = 0; i < parsed.length; i++) {
      const entry = parsed[i];
      if (!entry || typeof entry !== "object") continue;
      const obj = entry as Record<string, unknown>;
      const typeRaw = typeof obj.type === "string" ? obj.type.trim() : "";
      const type: ContactChannelType =
        typeRaw === "whatsapp" || typeRaw === "phone" || typeRaw === "email"
          ? typeRaw
          : "whatsapp";
      const label = typeof obj.label === "string" ? obj.label.trim() : "";
      const value = typeof obj.value === "string" ? obj.value.trim() : "";
      const displayValue = typeof obj.displayValue === "string" ? obj.displayValue.trim() : "";
      if (!value && !displayValue) continue;
      valid.push({
        id: typeof obj.id === "string" && obj.id.trim() ? obj.id.trim() : `ch-${i + 1}`,
        type,
        label:
          label ||
          (type === "whatsapp" ? "WhatsApp" : type === "phone" ? "Teléfono" : "Correo"),
        value: value || displayValue,
        displayValue: displayValue || value,
        isPrimaryOrder: type === "whatsapp" && Boolean(obj.isPrimaryOrder),
      });
    }
    if (valid.length === 0) {
      return buildLegacyChannels(legacyContent);
    }
    return valid;
  } catch {
    return buildLegacyChannels(legacyContent);
  }
}

export function serializeContactChannels(channels: ContactChannel[]): string {
  const clean = channels
    .filter((c) => Boolean(c.value?.trim() || c.displayValue?.trim()))
    .map((c, idx) => ({
      id: c.id?.trim() || `ch-${idx + 1}`,
      type: c.type,
      label: c.label?.trim() || (c.type === "whatsapp" ? "WhatsApp" : c.type === "phone" ? "Teléfono" : "Correo"),
      value: (c.value || c.displayValue || "").trim(),
      ...(c.displayValue?.trim() ? { displayValue: c.displayValue.trim() } : {}),
      ...(c.type === "whatsapp" && c.isPrimaryOrder ? { isPrimaryOrder: true } : {}),
    }));
  return JSON.stringify(clean);
}

function buildLegacySocialLinks(legacyContent?: Record<string, string> | null): ContactSocialLink[] {
  if (!legacyContent) return [];
  const url = legacyContent.contact_instagram_url?.trim() || "";
  const handle = legacyContent.contact_instagram_handle?.trim() || "";
  if (!url && !handle) return [];
  const resolvedUrl = url || `https://www.instagram.com/${handle.replace(/^@/, "")}/`;
  return [
    {
      id: "legacy-instagram",
      platform: "instagram",
      label: handle || "Instagram",
      url: resolvedUrl,
    },
  ];
}

export function parseSocialLinks(
  raw?: string | null,
  legacyContent?: Record<string, string> | null,
): ContactSocialLink[] {
  if (!raw || typeof raw !== "string" || !raw.trim()) {
    return buildLegacySocialLinks(legacyContent);
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return buildLegacySocialLinks(legacyContent);
    }
    const valid: ContactSocialLink[] = [];
    for (let i = 0; i < parsed.length; i++) {
      const entry = parsed[i];
      if (!entry || typeof entry !== "object") continue;
      const obj = entry as Record<string, unknown>;
      const platRaw = typeof obj.platform === "string" ? obj.platform.trim().toLowerCase() : "";
      const platform: SocialPlatform = VALID_SOCIAL_PLATFORMS.has(platRaw as SocialPlatform)
        ? (platRaw as SocialPlatform)
        : "custom";
      const url = typeof obj.url === "string" ? obj.url.trim() : "";
      const label = typeof obj.label === "string" ? obj.label.trim() : "";
      if (!url) continue;
      valid.push({
        id: typeof obj.id === "string" && obj.id.trim() ? obj.id.trim() : `social-${i + 1}`,
        platform,
        label: label || url.replace(/^https?:\/\/(www\.)?/i, "").split("/")[0] || "Red social",
        url: /^https?:\/\//i.test(url) ? url : `https://${url}`,
      });
    }
    if (valid.length === 0) {
      return buildLegacySocialLinks(legacyContent);
    }
    return valid;
  } catch {
    return buildLegacySocialLinks(legacyContent);
  }
}

export function serializeSocialLinks(links: ContactSocialLink[]): string {
  const clean = links
    .filter((l) => Boolean(l.url?.trim()))
    .map((l, idx) => ({
      id: l.id?.trim() || `social-${idx + 1}`,
      platform: VALID_SOCIAL_PLATFORMS.has(l.platform) ? l.platform : "custom",
      label: l.label?.trim() || "Red social",
      url: /^https?:\/\//i.test(l.url.trim()) ? l.url.trim() : `https://${l.url.trim()}`,
    }));
  return JSON.stringify(clean);
}

export function resolvePrimaryWhatsappChannel(
  channels: ContactChannel[],
  legacyWhatsapp?: string | null,
): { number: string; display: string } {
  const validWa = channels.filter(
    (c) => c.type === "whatsapp" && (c.value || "").replace(/\D/g, "").length >= 7,
  );
  const preferred = validWa.find((c) => c.isPrimaryOrder) ?? validWa[0];
  if (preferred) {
    return {
      number: preferred.value.trim(),
      display: (preferred.displayValue || preferred.value).trim(),
    };
  }
  const fallback = (legacyWhatsapp ?? "").trim();
  return { number: fallback, display: fallback };
}
