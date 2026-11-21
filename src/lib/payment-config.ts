/** Helpers puros para categorización, validación segura y enlaces de métodos de pago. */
import { z } from "zod";

export type PaymentCategoryKey = "automatic" | "manual" | "crypto" | "cash";

export type CryptoNetwork = "TRC20" | "BEP20" | "ERC20" | "Polygon";

export type ExtendedPaymentMethodConfig = {
  payment_url?: string;
  allowed_zones?: string;
  // Pasarelas automáticas (Wompi)
  is_wompi?: boolean;
  wompi_public_key?: string;
  wompi_env?: "sandbox" | "production";
  // Transferencias manuales (Nequi, Bancolombia, Daviplata)
  bank_name?: string;
  account_number?: string;
  account_holder?: string;
  require_proof?: boolean;
  // Cripto (USDT)
  wallet_address?: string;
  crypto_network?: CryptoNetwork;
};

export function isValidHttpsUrl(raw: string | null | undefined): boolean {
  const value = (raw ?? "").trim();
  if (!value || !/^https:\/\//i.test(value)) return false;
  try {
    const parsed = new URL(value);
    return parsed.protocol === "https:" && parsed.hostname.length > 0;
  } catch {
    return false;
  }
}

export const paymentMethodUpsertSchema = z
  .object({
    id: z.string().uuid().optional(),
    name: z.string().trim().min(2, "El nombre debe tener al menos 2 caracteres").max(120),
    type: z.enum([
      "manual_transfer",
      "gateway",
      "gateway_redirect",
      "cash_on_delivery",
      "cash_point",
      "crypto",
    ]),
    instructions: z.string().trim().max(4000).optional().default(""),
    qr_image_url: z.string().trim().max(500).optional().default(""),
    display_order: z.number().int().min(0).max(999).optional().default(0),
    is_active: z.boolean().optional().default(false),
    config: z
      .object({
        payment_url: z.preprocess(
          (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
          z.string().trim().url("Ingresa una URL válida").max(500).optional(),
        ),
        allowed_zones: z.string().trim().max(300).optional(),
        is_wompi: z.boolean().optional(),
        wompi_public_key: z.string().trim().max(200).optional(),
        wompi_env: z.enum(["sandbox", "production"]).optional(),
        bank_name: z.string().trim().max(120).optional(),
        account_number: z.string().trim().max(120).optional(),
        account_holder: z.string().trim().max(120).optional(),
        require_proof: z.boolean().optional(),
        wallet_address: z.string().trim().max(200).optional(),
        crypto_network: z.enum(["TRC20", "BEP20", "ERC20", "Polygon"]).optional(),
      })
      .partial()
      .optional()
      .default({}),
    /** Pares clave/valor. Si viene vacío en una edición, se conservan las credenciales guardadas. */
    credentials: z
      .array(z.object({ key: z.string().trim().min(1).max(80), value: z.string().max(2000) }))
      .max(20)
      .optional()
      .default([]),
  })
  .superRefine((val, ctx) => {
    const isGateway = val.type === "gateway" || val.type === "gateway_redirect";
    const paymentUrl = val.config?.payment_url?.trim() ?? "";
    if (isGateway && !isValidHttpsUrl(paymentUrl)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["config", "payment_url"],
        message:
          "Indica la URL HTTPS válida de pago / link de checkout (ej. https://checkout.wompi.co/l/xxxxx)",
      });
    }
    if (val.type === "crypto" && !paymentUrl && !val.config?.wallet_address?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["config", "wallet_address"],
        message: "Indica la dirección de billetera (wallet) o el enlace de pago cripto",
      });
    }
  });

export const PAYMENT_CATEGORIES: Array<{
  key: PaymentCategoryKey;
  label: string;
  description: string;
  types: string[];
}> = [
  {
    key: "automatic",
    label: "Pasarelas Automáticas",
    description: "Wompi, PSE y tarjetas con confirmación por webhook en tiempo real.",
    types: ["gateway_redirect", "gateway"],
  },
  {
    key: "manual",
    label: "Transferencias Manuales",
    description: "Nequi, Bancolombia, Daviplata con número, titular, QR y comprobante.",
    types: ["manual_transfer"],
  },
  {
    key: "crypto",
    label: "Cripto (USDT)",
    description: "Pagos en USDT TRC20 / BEP20 con dirección de billetera y explorador.",
    types: ["crypto"],
  },
  {
    key: "cash",
    label: "Contra Entrega / Taller",
    description: "Efectivo al recibir, pago en taller o puntos físicos como Efecty.",
    types: ["cash_on_delivery", "cash_point"],
  },
];

export function paymentCategoryForType(type: string | null | undefined): PaymentCategoryKey {
  switch (type) {
    case "gateway_redirect":
    case "gateway":
      return "automatic";
    case "crypto":
      return "crypto";
    case "cash_on_delivery":
    case "cash_point":
      return "cash";
    default:
      return "manual";
  }
}

export function paymentCategoryLabel(type: string | null | undefined): string {
  const cat = paymentCategoryForType(type);
  return PAYMENT_CATEGORIES.find((c) => c.key === cat)?.label ?? "Transferencias Manuales";
}

export function getCryptoExplorerUrl(
  network: string | null | undefined,
  walletAddress: string | null | undefined,
): string | null {
  const addr = (walletAddress ?? "").trim();
  if (!addr || addr.length < 16) return null;
  const safeAddr = encodeURIComponent(addr);
  switch (network) {
    case "TRC20":
      return `https://tronscan.org/#/address/${safeAddr}`;
    case "BEP20":
      return `https://bscscan.com/address/${safeAddr}`;
    case "Polygon":
      return `https://polygonscan.com/address/${safeAddr}`;
    case "ERC20":
      return `https://etherscan.io/address/${safeAddr}`;
    default:
      return `https://tronscan.org/#/address/${safeAddr}`;
  }
}

const SECRET_CONFIG_KEYS = new Set([
  "api_key",
  "secret",
  "private_key",
  "wompi_events_secret",
  "wompi_integrity_secret",
  "wompi_private_key",
  "integrity_secret",
  "events_secret",
  "token",
]);

/** Asegura que `config` (público) jamás almacene llaves privadas ni secretos. */
export function sanitizePublicPaymentConfig(
  raw: Record<string, unknown> | null | undefined,
): ExtendedPaymentMethodConfig {
  if (!raw || typeof raw !== "object") return {};
  const out: ExtendedPaymentMethodConfig = {};

  if (typeof raw.payment_url === "string" && raw.payment_url.trim()) {
    out.payment_url = raw.payment_url.trim();
  }
  if (typeof raw.allowed_zones === "string" && raw.allowed_zones.trim()) {
    out.allowed_zones = raw.allowed_zones.trim();
  }
  if (typeof raw.is_wompi === "boolean") {
    out.is_wompi = raw.is_wompi;
  }
  if (typeof raw.wompi_public_key === "string" && raw.wompi_public_key.trim()) {
    out.wompi_public_key = raw.wompi_public_key.trim();
  }
  if (raw.wompi_env === "sandbox" || raw.wompi_env === "production") {
    out.wompi_env = raw.wompi_env;
  }
  if (typeof raw.bank_name === "string" && raw.bank_name.trim()) {
    out.bank_name = raw.bank_name.trim();
  }
  if (typeof raw.account_number === "string" && raw.account_number.trim()) {
    out.account_number = raw.account_number.trim();
  }
  if (typeof raw.account_holder === "string" && raw.account_holder.trim()) {
    out.account_holder = raw.account_holder.trim();
  }
  if (typeof raw.require_proof === "boolean") {
    out.require_proof = raw.require_proof;
  }
  if (typeof raw.wallet_address === "string" && raw.wallet_address.trim()) {
    out.wallet_address = raw.wallet_address.trim();
  }
  if (
    raw.crypto_network === "TRC20" ||
    raw.crypto_network === "BEP20" ||
    raw.crypto_network === "ERC20" ||
    raw.crypto_network === "Polygon"
  ) {
    out.crypto_network = raw.crypto_network;
  }

  for (const key of Object.keys(out)) {
    if (SECRET_CONFIG_KEYS.has(key)) {
      delete (out as Record<string, unknown>)[key];
    }
  }
  return out;
}

export function getWompiWebhookUrl(origin?: string): string {
  const base = (origin || "https://will-design-3d.lovable.app").replace(/\/+$/, "");
  return `${base}/api/public/wompi-webhook`;
}

/**
 * Extrae una ruta con puntos de un objeto de evento Wompi (`transaction.id`, `transaction.status`, etc.).
 */
export function pickPathValue(obj: Record<string, unknown>, path: string): string {
  const parts = path.split(".");
  let cur: unknown = obj;
  for (const part of parts) {
    if (!cur || typeof cur !== "object") return "";
    cur = (cur as Record<string, unknown>)[part];
  }
  if (cur === null || cur === undefined) return "";
  return String(cur);
}

/** Construye la cadena base oficial para verificar el checksum SHA256 de webhooks de Wompi. */
export function buildWompiChecksumInput(
  data: Record<string, unknown>,
  properties: string[],
  timestamp: string | number,
  eventsSecret: string,
): string {
  const concatenated = properties.map((prop) => pickPathValue(data, prop)).join("");
  return `${concatenated}${timestamp}${eventsSecret}`;
}
