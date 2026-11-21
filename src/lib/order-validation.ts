import { z } from "zod";
import { normalizeWhatsAppDigits } from "@/lib/notification-templates";

const optionalUuid = z
  .union([z.string().trim(), z.null()])
  .optional()
  .transform((val) => {
    if (typeof val !== "string") return undefined;
    const trimmed = val.trim();
    return trimmed ? trimmed : undefined;
  })
  .refine((val) => val === undefined || z.string().uuid().safeParse(val).success, {
    message: "El identificador del producto o servicio no es válido.",
  });

const optionalNullableUuid = z
  .union([z.string().trim(), z.null()])
  .optional()
  .transform((val) => {
    if (typeof val !== "string") return null;
    const trimmed = val.trim();
    return trimmed ? trimmed : null;
  })
  .refine((val) => val === null || z.string().uuid().safeParse(val).success, {
    message: "El método de pago seleccionado no es válido.",
  });

export const STRICT_EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const orderRequestSchema = z
  .object({
    product_id: optionalUuid,
    variant_id: z
      .union([z.string().trim().max(120, "Identificador de variante demasiado largo."), z.null()])
      .optional()
      .transform((val) => (typeof val === "string" ? val.trim() : "")),
    service_id: optionalUuid,
    service_slug: z.string().trim().max(160).optional().default(""),
    quantity: z.number().int().min(1).max(99).optional().default(1),
    customer_name: z
      .string()
      .trim()
      .min(2, "Por favor ingresa tu nombre completo.")
      .max(120),
    customer_email: z.string().trim().max(160).optional().default(""),
    customer_phone: z.string().trim().max(40).optional().default(""),
    shipping_address: z.string().trim().max(300).optional().default(""),
    shipping_city: z.string().trim().max(120).optional().default(""),
    notes: z.string().trim().max(1000).optional().default(""),
    quick_capture: z.boolean().optional().default(false),
  })
  .superRefine((val, ctx) => {
    if (!val.product_id && !val.service_id && !val.service_slug.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["product_id"],
        message: "Selecciona un producto o servicio válido.",
      });
    }
    if (val.quick_capture) {
      if (!normalizeWhatsAppDigits(val.customer_phone)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["customer_phone"],
          message: "Ingresa un número de celular WhatsApp válido (mínimo 7 dígitos).",
        });
      }
      if (val.customer_email && !z.string().email().safeParse(val.customer_email).success) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["customer_email"],
          message: "Ingresa un correo electrónico válido (ej: nombre@correo.com).",
        });
      }
    } else {
      if (!z.string().email().safeParse(val.customer_email).success) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["customer_email"],
          message: "Ingresa un correo electrónico válido (ej: nombre@correo.com).",
        });
      }
      if (val.shipping_address.trim().length < 4) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["shipping_address"],
          message: "Ingresa la dirección de envío.",
        });
      }
    }
  });

export type ValidatedOrderRequest = z.infer<typeof orderRequestSchema>;

/** Valida el payload de creación de pedido y devuelve mensajes legibles en español ante fallos. */
export function parseOrderRequestInput(data: unknown): ValidatedOrderRequest {
  const result = orderRequestSchema.safeParse(data);
  if (!result.success) {
    const firstMsg = result.error.issues[0]?.message;
    throw new Error(firstMsg || "Verifica los datos ingresados e intenta de nuevo.");
  }
  return result.data;
}

export const cartOrderSchema = z
  .object({
    items: z
      .array(
        z.object({
          product_id: z.string().min(1, "Producto inválido en el carrito.").max(200),
          quantity: z.number().int().min(1, "La cantidad mínima es 1.").max(99),
          kind: z.enum(["product", "service"]).optional().default("product"),
          service_slug: z.string().trim().max(120).optional(),
          answers: z.record(z.string(), z.string().max(400)).optional(),
        }),
      )
      .min(1, "Agrega al menos un producto o servicio al carrito.")
      .max(40),
    customer_name: z
      .string()
      .trim()
      .min(2, "Por favor ingresa tu nombre completo.")
      .max(120),
    customer_email: z.string().trim().max(160).optional().default(""),
    customer_phone: z.string().trim().max(40).optional().default(""),
    shipping_address: z
      .string()
      .trim()
      .min(4, "Por favor ingresa la dirección de envío.")
      .max(300),
    shipping_city: z.string().trim().max(120).optional().default(""),
    notes: z.string().trim().max(1000).optional().default(""),
    payment_method_id: optionalNullableUuid,
  })
  .superRefine((val, ctx) => {
    const email = val.customer_email.trim();
    const hasPhone = Boolean(normalizeWhatsAppDigits(val.customer_phone));

    if (email) {
      if (!z.string().email().safeParse(email).success || !STRICT_EMAIL_REGEX.test(email)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["customer_email"],
          message:
            "Ingresa un correo electrónico válido (ej: nombre@correo.com) o déjalo vacío si ingresaste tu WhatsApp.",
        });
      }
    } else if (!hasPhone) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["customer_phone"],
        message:
          "Ingresa tu correo electrónico o un número de WhatsApp válido (mínimo 7 dígitos) para confirmar tu pedido.",
      });
    }
  });

export type ValidatedCartOrderInput = z.infer<typeof cartOrderSchema> & {
  resolved_customer_email: string;
};

/** Valida el checkout del carrito permitiendo correo opcional cuando hay WhatsApp válido. */
export function parseCartOrderInput(data: unknown): ValidatedCartOrderInput {
  const result = cartOrderSchema.safeParse(data);
  if (!result.success) {
    const firstMsg = result.error.issues[0]?.message;
    throw new Error(firstMsg || "Verifica tus datos de envío y contacto e intenta de nuevo.");
  }
  const email = result.data.customer_email.trim();
  const digits = normalizeWhatsAppDigits(result.data.customer_phone) || "cliente";
  return {
    ...result.data,
    customer_email: email,
    resolved_customer_email: email || `whatsapp-${digits}@pedido.willdesign3d.local`,
  };
}

/** Convierte errores técnicos o arreglos JSON de Zod en avisos claros en español para el cliente. */
export function formatReadableOrderError(err: unknown): string {
  const raw =
    err instanceof Error
      ? err.message
      : typeof err === "string"
        ? err
        : "";
  const trimmed = raw.trim();
  if (!trimmed) {
    return "No pudimos registrar tu pedido. Intenta de nuevo.";
  }

  if (trimmed.startsWith("[")) {
    try {
      const parsed = JSON.parse(trimmed) as Array<{ message?: unknown; path?: unknown; validation?: unknown }>;
      if (Array.isArray(parsed) && parsed.length > 0) {
        const first = parsed[0];
        const msg = typeof first?.message === "string" ? first.message : "";
        if (first?.validation === "email" || /invalid email/i.test(msg)) {
          return "Ingresa un correo electrónico válido (ej: nombre@correo.com) o déjalo vacío si ya ingresaste tu WhatsApp.";
        }
        if (msg && !/invalid uuid/i.test(msg)) {
          return msg;
        }
        return "Verifica los datos del producto y tus datos de contacto e intenta de nuevo.";
      }
    } catch {
      // Continuar al fallback legible
    }
  }

  if (/invalid email/i.test(trimmed)) {
    return "Ingresa un correo electrónico válido (ej: nombre@correo.com) o déjalo vacío si ya ingresaste tu WhatsApp.";
  }

  if (/invalid uuid/i.test(trimmed)) {
    return "No pudimos validar el producto o variante seleccionada. Recarga la página e intenta de nuevo.";
  }

  return trimmed;
}
