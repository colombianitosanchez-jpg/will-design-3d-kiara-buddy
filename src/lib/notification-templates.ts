/** Utilidades puras para plantillas de notificación (WhatsApp + Telegram) y enlaces wa.me. */

export const PUBLIC_PANEL_ORDERS_URL = "https://will-design-3d.lovable.app/panel/pedidos";

export type TelegramEventKey =
  | "tg_new_order"
  | "tg_new_quote"
  | "tg_voucher"
  | "tg_payment_confirmed"
  | "tg_status_change";

export const TELEGRAM_EVENT_LABELS: { key: TelegramEventKey; label: string; description: string }[] = [
  {
    key: "tg_new_order",
    label: "Nuevos Pedidos",
    description: "Alerta inmediata cuando un cliente finaliza el carrito o compra rápida por WhatsApp.",
  },
  {
    key: "tg_new_quote",
    label: "Cotizaciones 3D Entrantes",
    description: "Alerta inmediata cuando un cliente envía una solicitud desde el Cotizador 3D.",
  },
  {
    key: "tg_voucher",
    label: "Comprobantes Subidos",
    description: "Alerta cuando un cliente reporta o sube la referencia de pago de su pedido.",
  },
  {
    key: "tg_payment_confirmed",
    label: "Pagos Confirmados / Wompi",
    description: "Alerta cuando se aprueba un comprobante o entra un webhook de pago aprobado.",
  },
  {
    key: "tg_status_change",
    label: "Cambios de Estado",
    description: "Alerta cuando el pedido pasa a empacando, enviado, entregado o cancelado.",
  },
];

export const DEFAULT_ORDER_TEMPLATES: Record<string, string> = {
  pendiente:
    "¡Hola {{nombre}}! Recibimos tu pedido {{pedido}} por {{total}} en Will Design 3D 🐾 Te avisamos cuando entre a impresión.",
  empacando:
    "¡Hola {{nombre}}! Tu pedido {{pedido}} ya está en impresión/empaque en Will Design 3D.",
  enviado:
    "¡Hola {{nombre}}! Tu pedido {{pedido}} fue enviado. {{guia}} ¡Gracias por confiar en Will Design 3D!",
  entregado: "¡Hola {{nombre}}! Tu pedido {{pedido}} fue entregado. ¡Gracias por tu compra!",
  cancelado: "Hola {{nombre}}, tu pedido {{pedido}} fue cancelado. Escríbenos si necesitas ayuda.",
  comprobante_enviado:
    "Hola {{nombre}}, recibimos el comprobante de tu pedido {{pedido}}. Estamos verificando el pago.",
  pago_confirmado:
    "¡Hola {{nombre}}! Confirmamos el pago de tu pedido {{pedido}} ({{total}}). ¡Empezamos a prepararlo!",
  pago_rechazado:
    "Hola {{nombre}}, no pudimos verificar el comprobante de tu pedido {{pedido}}. {{nota}}",
};

/** Convierte un UUID de pedido en código corto legible tipo #WD-A1B2C3D4. */
export function formatOrderCode(orderId: string): string {
  const clean = (orderId || "").trim();
  if (!clean) return "#WD-00000000";
  if (clean.toUpperCase().startsWith("#WD-")) return clean.toUpperCase();
  const short = clean.replace(/[^a-zA-Z0-9]/g, "").slice(0, 8).toUpperCase();
  return `#WD-${short}`;
}

export function formatCopCurrency(amount: number | null | undefined): string {
  const n = Math.round(Number(amount) || 0);
  return `$${n.toLocaleString("es-CO")}`;
}

export function normalizeWhatsAppDigits(phone: string | null | undefined): string {
  const digits = (phone ?? "").replace(/[^0-9]/g, "");
  if (digits.length < 7) return "";
  // Celulares colombianos de 10 dígitos sin indicativo (ej: 3001234567 -> 573001234567)
  if (digits.length === 10 && digits.startsWith("3")) {
    return `57${digits}`;
  }
  return digits;
}

export function buildCustomerWhatsAppUrl(
  phone: string | null | undefined,
  message: string,
): string | null {
  const digits = normalizeWhatsAppDigits(phone);
  if (!digits) return null;
  const text = message.trim();
  return text ? `https://wa.me/${digits}?text=${encodeURIComponent(text)}` : `https://wa.me/${digits}`;
}

export interface TemplateContext {
  customerName?: string | null;
  orderId?: string | null;
  orderCode?: string | null;
  status?: string | null;
  totalCop?: number | null;
  guia?: string | null;
  note?: string | null;
}

export function expandNotificationTemplate(template: string, ctx: TemplateContext): string {
  const nombre = (ctx.customerName ?? "cliente").trim() || "cliente";
  const pedido = ctx.orderCode?.trim() || (ctx.orderId ? formatOrderCode(ctx.orderId) : "#WD-PEDIDO");
  const estado = (ctx.status ?? "").trim();
  const total = ctx.totalCop != null ? formatCopCurrency(ctx.totalCop) : "";
  const guiaRaw = (ctx.guia ?? "").trim();
  const guiaText = guiaRaw ? `Guía de rastreo: ${guiaRaw}.` : "";
  const nota = (ctx.note ?? "").trim();

  let out = template || "";
  const pairs: Array<[string[], string]> = [
    [["{{nombre}}", "{nombre}", "{{cliente}}", "{cliente}"], nombre],
    [["{{pedido}}", "{pedido}"], pedido],
    [["{{estado}}", "{estado}"], estado],
    [["{{total}}", "{total}"], total],
    [["{{guia}}", "{guia}"], guiaText],
    [["{{nota}}", "{nota}"], nota],
  ];

  for (const [tokens, value] of pairs) {
    for (const token of tokens) {
      out = out.replaceAll(token, value);
    }
  }

  return out.replace(/[ \t]{2,}/g, " ").replace(/\n{3,}/g, "\n\n").trim();
}

export function buildQuickOrderWhatsappMessage(input: {
  orderCode: string;
  totalCop: number;
  productName: string;
  variantName?: string | null;
  customerName: string;
  shippingCity?: string | null;
  shareUrl?: string | null;
  customNote?: string | null;
}): string {
  const itemLabel = input.variantName
    ? `${input.productName} (${input.variantName})`
    : input.productName;
  const headerLine =
    input.totalCop > 0
      ? `Hola Will Design 3D, acabo de registrar mi pedido ${input.orderCode} por ${formatCopCurrency(input.totalCop)}.`
      : `Hola Will Design 3D, acabo de registrar mi solicitud ${input.orderCode}.`;
  const lines = [
    headerLine,
    `Producto / Servicio: ${itemLabel}`,
    `Cliente: ${input.customerName.trim()}${input.shippingCity?.trim() ? ` (${input.shippingCity.trim()})` : ""}`,
  ];
  if (input.customNote?.trim()) {
    lines.push(input.customNote.trim());
  }
  if (input.shareUrl?.trim()) {
    lines.push(input.shareUrl.trim());
  }
  return lines.join("\n");
}

export function escapeTelegramHtml(text: string | null | undefined): string {
  return String(text ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

export function isTelegramEventEnabled(
  events: Record<string, unknown> | null | undefined,
  key: TelegramEventKey,
): boolean {
  if (!events || typeof events[key] === "undefined") return true;
  return Boolean(events[key]);
}

export function buildTelegramOrderHtml(input: {
  orderId: string;
  customerName: string;
  customerPhone?: string | null;
  customerEmail?: string | null;
  shippingAddress?: string | null;
  shippingCity?: string | null;
  totalCop: number;
  paymentMethodName?: string | null;
  items: Array<{ product_name: string; quantity: number; unit_price_cop?: number }>;
  sourceLabel?: string;
}): string {
  const code = formatOrderCode(input.orderId);
  const itemLines = input.items.length
    ? input.items
        .map(
          (i) =>
            `• ${i.quantity}x ${escapeTelegramHtml(i.product_name)}${
              i.unit_price_cop != null ? ` (${formatCopCurrency(i.unit_price_cop * i.quantity)})` : ""
            }`,
        )
        .join("\n")
    : "• Sin detalle de ítems";
  const address = [input.shippingAddress, input.shippingCity].filter(Boolean).join(", ") || "Por confirmar";
  const contact = [input.customerPhone || "Sin celular", input.customerEmail || "Sin correo"]
    .filter(Boolean)
    .join(" · ");

  return [
    `🛒 <b>Nuevo Pedido ${escapeTelegramHtml(code)}</b>${input.sourceLabel ? ` (${escapeTelegramHtml(input.sourceLabel)})` : ""}`,
    `👤 <b>Cliente:</b> ${escapeTelegramHtml(input.customerName)}`,
    `📱 <b>Contacto:</b> ${escapeTelegramHtml(contact)}`,
    `📍 <b>Envío:</b> ${escapeTelegramHtml(address)}`,
    `💰 <b>Total:</b> ${escapeTelegramHtml(formatCopCurrency(input.totalCop))}`,
    `💳 <b>Pago:</b> ${escapeTelegramHtml(input.paymentMethodName || "Por definir / WhatsApp")}`,
    `📦 <b>Productos:</b>\n${itemLines}`,
    `🔗 <a href="${PUBLIC_PANEL_ORDERS_URL}">Ver pedido en Panel</a>`,
  ].join("\n");
}

export function buildTelegramVoucherHtml(input: {
  orderId: string;
  customerName: string;
  totalCop: number;
  paymentReference: string;
  paymentMethodName?: string | null;
}): string {
  const code = formatOrderCode(input.orderId);
  return [
    `🧾 <b>Comprobante de Pago Recibido — ${escapeTelegramHtml(code)}</b>`,
    `👤 <b>Cliente:</b> ${escapeTelegramHtml(input.customerName)}`,
    `💰 <b>Monto:</b> ${escapeTelegramHtml(formatCopCurrency(input.totalCop))}`,
    `💳 <b>Método:</b> ${escapeTelegramHtml(input.paymentMethodName || "Manual / Transferencia")}`,
    `🔎 <b>Referencia:</b> <code>${escapeTelegramHtml(input.paymentReference)}</code>`,
    `🔗 <a href="${PUBLIC_PANEL_ORDERS_URL}">Verificar comprobante en Panel</a>`,
  ].join("\n");
}

export function buildTelegramPaymentConfirmedHtml(input: {
  orderId: string;
  customerName?: string | null;
  totalCop?: number | null;
  paymentMethodName?: string | null;
  reference?: string | null;
  gateway?: string | null;
}): string {
  const code = formatOrderCode(input.orderId);
  return [
    `✅ <b>Pago Confirmado — ${escapeTelegramHtml(code)}</b>`,
    input.customerName ? `👤 <b>Cliente:</b> ${escapeTelegramHtml(input.customerName)}` : "",
    input.totalCop != null ? `💰 <b>Total:</b> ${escapeTelegramHtml(formatCopCurrency(input.totalCop))}` : "",
    `💳 <b>Canal:</b> ${escapeTelegramHtml(input.gateway || input.paymentMethodName || "Confirmado en panel")}`,
    input.reference ? `🔖 <b>Referencia:</b> <code>${escapeTelegramHtml(input.reference)}</code>` : "",
    `🔗 <a href="${PUBLIC_PANEL_ORDERS_URL}">Abrir Panel de Pedidos</a>`,
  ]
    .filter(Boolean)
    .join("\n");
}

export type TelegramQuoteInput = {
  quoteId?: string | null;
  serviceName: string;
  customerName: string;
  customerPhone?: string | null;
  customerEmail?: string | null;
  totalCop: number;
  fileName?: string | null;
  answers?: Array<{ label: string; value: string }>;
  answersList?: string | null;
  notes?: string | null;
};

export function buildTelegramQuoteHtml(input: TelegramQuoteInput): string {
  const answersLines =
    input.answers && input.answers.length > 0
      ? input.answers
          .map((a) => `• ${escapeTelegramHtml(a.label)}: ${escapeTelegramHtml(a.value)}`)
          .join("\n")
      : input.answersList?.trim()
        ? escapeTelegramHtml(input.answersList.trim())
        : "• Sin detalles técnicos adicionales";

  return [
    `<b>📋 NUEVA COTIZACIÓN 3D SOLICITADA</b>`,
    `<b>Servicio:</b> ${escapeTelegramHtml(input.serviceName || "Cotización 3D")}`,
    `<b>Cliente:</b> ${escapeTelegramHtml(input.customerName)}`,
    `<b>WhatsApp / Tel:</b> ${escapeTelegramHtml(input.customerPhone || "No registrado")}`,
    `<b>Correo:</b> ${escapeTelegramHtml(input.customerEmail || "No registrado")}`,
    `<b>Total Estimado:</b> ${escapeTelegramHtml(formatCopCurrency(input.totalCop))}`,
    `<b>Archivo 3D adjunto:</b> ${escapeTelegramHtml(input.fileName?.trim() || "Sin archivo adjunto")}`,
    `<b>Detalles técnicos:</b>\n${answersLines}`,
    input.notes?.trim() ? `<b>Notas:</b> ${escapeTelegramHtml(input.notes.trim())}` : "",
    `🔗 <a href="${PUBLIC_PANEL_ORDERS_URL}">Ver cotización en Panel</a>`,
  ]
    .filter(Boolean)
    .join("\n");
}

export function buildTelegramStatusChangeHtml(input: {
  orderId: string;
  customerName: string;
  status: string;
  totalCop?: number | null;
  guia?: string | null;
}): string {
  const code = formatOrderCode(input.orderId);
  return [
    `🚚 <b>Pedido ${escapeTelegramHtml(code)} actualizado</b>`,
    `👤 <b>Cliente:</b> ${escapeTelegramHtml(input.customerName)}`,
    `📌 <b>Nuevo estado:</b> <b>${escapeTelegramHtml(input.status.toUpperCase())}</b>`,
    input.totalCop != null ? `💰 <b>Total:</b> ${escapeTelegramHtml(formatCopCurrency(input.totalCop))}` : "",
    input.guia ? `📦 <b>Guía:</b> <code>${escapeTelegramHtml(input.guia)}</code>` : "",
    `🔗 <a href="${PUBLIC_PANEL_ORDERS_URL}">Gestionar en Panel</a>`,
  ]
    .filter(Boolean)
    .join("\n");
}

export function normalizeQueueStatusLabel(status: string): {
  label: string;
  tone: "sent" | "pending" | "manual" | "failed";
} {
  switch (status) {
    case "sent":
      return { label: "Enviado", tone: "sent" };
    case "manual":
      return { label: "Manual", tone: "manual" };
    case "failed":
      return { label: "Error", tone: "failed" };
    default:
      return { label: "Pendiente", tone: "pending" };
  }
}
