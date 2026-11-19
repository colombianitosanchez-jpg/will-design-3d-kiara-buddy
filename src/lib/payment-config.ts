/** Helpers puros para categorización, validación segura y enlaces de métodos de pago. */

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
