import {
  formatCOP,
  type QuoterOption,
  type QuoterService,
} from "./quoter-core";

export type BrandAccentColor = "orange" | "teal" | "wine";

export type AccentTokens = {
  cssVar: string;
  deepVar: string;
  softBg: string;
  borderSoft: string;
};

export function accentTokensFor(color?: string | null): AccentTokens {
  if (color === "teal") {
    return {
      cssVar: "var(--brand-teal)",
      deepVar: "var(--brand-teal-deep)",
      softBg: "color-mix(in oklab, var(--brand-teal) 14%, white)",
      borderSoft: "color-mix(in oklab, var(--brand-teal) 35%, transparent)",
    };
  }
  if (color === "wine") {
    return {
      cssVar: "var(--brand-wine)",
      deepVar: "var(--brand-wine-deep)",
      softBg: "color-mix(in oklab, var(--brand-wine) 12%, white)",
      borderSoft: "color-mix(in oklab, var(--brand-wine) 35%, transparent)",
    };
  }
  return {
    cssVar: "var(--brand-orange)",
    deepVar: "var(--brand-orange-deep)",
    softBg: "color-mix(in oklab, var(--brand-orange) 14%, white)",
    borderSoft: "color-mix(in oklab, var(--brand-orange) 38%, transparent)",
  };
}

export function normalizeSiteAnchor(raw?: string | null): string {
  return (raw ?? "").trim();
}

export function clampSliderValue(
  raw: number | string,
  min: number,
  max: number,
  step = 1,
): number {
  const safeMin = Number.isFinite(min) ? min : 0;
  const safeMax = Number.isFinite(max) && max >= safeMin ? max : safeMin + 100;
  const safeStep = Number.isFinite(step) && step > 0 ? step : 1;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) return safeMin;
  const clamped = Math.min(safeMax, Math.max(safeMin, parsed));
  const steps = Math.round((clamped - safeMin) / safeStep);
  const aligned = safeMin + steps * safeStep;
  // Avoid floating point drift like 0.30000000000000004
  const decimals = safeStep.toString().includes(".")
    ? safeStep.toString().split(".")[1]?.length ?? 2
    : 0;
  const rounded = Number(aligned.toFixed(decimals));
  return Math.min(safeMax, Math.max(safeMin, rounded));
}

export function sliderPercentage(value: number, min: number, max: number): number {
  if (!Number.isFinite(min) || !Number.isFinite(max) || max <= min) return 0;
  const pct = ((value - min) / (max - min)) * 100;
  return Math.min(100, Math.max(0, Number.isFinite(pct) ? pct : 0));
}

export function formatOptionPriceBadge(opt: Pick<QuoterOption, "add_cop" | "multiplier">): string | null {
  const parts: string[] = [];
  if (opt.add_cop && opt.add_cop !== 0) {
    parts.push(`${opt.add_cop > 0 ? "+" : ""}${formatCOP(opt.add_cop)}`);
  }
  if (opt.multiplier && opt.multiplier !== 1) {
    parts.push(`×${opt.multiplier}`);
  }
  return parts.length > 0 ? parts.join(" · ") : null;
}

export type ServicePrimaryAction =
  | {
      kind: "quoter";
      quoterSlug: string;
      minPriceCop: number;
      label: string;
    }
  | {
      kind: "whatsapp";
      message: string;
      label: string;
    };

export function findLinkedQuoterService(
  serviceSlugOrAnchor: string,
  quoterServiceId: string | null | undefined,
  quoterServices: QuoterService[],
): QuoterService | null {
  if (quoterServiceId) {
    return quoterServices.find((q) => q.id === quoterServiceId && q.is_active) ?? null;
  }
  return (
    quoterServices.find(
      (q) => q.is_active && (q.slug === serviceSlugOrAnchor || q.site_anchor === serviceSlugOrAnchor),
    ) ?? null
  );
}

export function resolveServicePrimaryAction(params: {
  serviceTitle: string;
  serviceSlug: string;
  quoterServiceId?: string | null;
  whatsappTemplate?: string | null;
  contactMode?: string;
  quoterServices: QuoterService[];
  businessName?: string;
}): ServicePrimaryAction {
  const linked = findLinkedQuoterService(
    params.serviceSlug,
    params.quoterServiceId,
    params.quoterServices,
  );
  const hasCalc = params.contactMode !== "whatsapp" && linked ? linked.has_calculator !== false : false;
  if (linked && hasCalc) {
    return {
      kind: "quoter",
      quoterSlug: linked.slug,
      minPriceCop: linked.min_price_cop,
      label: "Cotizar en línea",
    };
  }
  const business = params.businessName?.trim() || "Will Design 3D";
  const fallbackMsg = `Hola ${business}! Me interesa solicitar información y cotización sobre el servicio: *${params.serviceTitle}*`;
  const customMsg =
    params.whatsappTemplate?.trim() ||
    linked?.whatsapp_custom_message?.trim() ||
    fallbackMsg;
  return {
    kind: "whatsapp",
    message: customMsg,
    label: "Cotizar por WhatsApp",
  };
}
