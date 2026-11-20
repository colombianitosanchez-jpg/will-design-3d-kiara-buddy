import {
  buildTelegramOrderHtml,
  buildTelegramPaymentConfirmedHtml,
  buildTelegramStatusChangeHtml,
  buildTelegramVoucherHtml,
  isTelegramEventEnabled,
  type TelegramEventKey,
} from "@/lib/notification-templates";

export type TelegramConfig = {
  botToken: string;
  chatId: string;
  events: Record<string, unknown>;
};

export async function getTelegramConfig(): Promise<TelegramConfig> {
  const envToken = (process.env["TELEGRAM_BOT_TOKEN"] ?? "").trim();
  const envChatId = (process.env["TELEGRAM_CHAT_ID"] ?? "").trim();

  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin
      .from("notification_settings")
      .select("events, templates")
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    const events = (data?.events ?? {}) as Record<string, unknown>;
    const { data: secrets } = await supabaseAdmin
      .from("integration_secrets")
      .select("key, value")
      .in("key", ["telegram_bot_token", "telegram_chat_id"]);
    const map = new Map((secrets ?? []).map((r) => [r.key, (r.value ?? "").trim()]));
    const dbToken = map.get("telegram_bot_token") ?? "";
    const dbChatId = map.get("telegram_chat_id") ?? "";

    return {
      botToken: dbToken || envToken,
      chatId: dbChatId || envChatId,
      events,
    };
  } catch (err) {
    console.error("[Telegram] Error leyendo configuración:", err);
    return { botToken: envToken, chatId: envChatId, events: {} };
  }
}

export async function sendTelegramNotification(params: {
  text: string;
  parse_mode?: "HTML" | "Markdown";
  overrideToken?: string;
  overrideChatId?: string;
}): Promise<{ ok: boolean; skipped?: boolean; error?: string }> {
  try {
    const cfg =
      params.overrideToken && params.overrideChatId
        ? { botToken: params.overrideToken.trim(), chatId: params.overrideChatId.trim() }
        : await getTelegramConfig();

    const token = (params.overrideToken ?? cfg.botToken ?? "").trim();
    const chatId = (params.overrideChatId ?? cfg.chatId ?? "").trim();

    if (!token || !chatId) {
      return { ok: false, skipped: true, error: "Bot Token o Chat ID de Telegram no configurado." };
    }

    const res = await fetch(`https://api.telegram.org/bot${encodeURIComponent(token)}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: params.text,
        parse_mode: params.parse_mode ?? "HTML",
        disable_web_page_preview: true,
      }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.error("[Telegram] API error:", res.status, body);
      return { ok: false, error: `Telegram HTTP ${res.status}: ${body.slice(0, 200)}` };
    }

    return { ok: true };
  } catch (err) {
    console.error("[Telegram] Fallo enviando notificación:", err);
    return { ok: false, error: (err as Error).message };
  }
}

async function shouldNotify(eventKey: TelegramEventKey): Promise<TelegramConfig | null> {
  const cfg = await getTelegramConfig();
  if (!cfg.botToken || !cfg.chatId) return null;
  if (!isTelegramEventEnabled(cfg.events, eventKey)) return null;
  return cfg;
}

export async function notifyTelegramNewOrder(input: {
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
}): Promise<void> {
  try {
    const cfg = await shouldNotify("tg_new_order");
    if (!cfg) return;
    await sendTelegramNotification({
      text: buildTelegramOrderHtml(input),
      overrideToken: cfg.botToken,
      overrideChatId: cfg.chatId,
    });
  } catch (err) {
    console.error("[Telegram] notifyTelegramNewOrder:", err);
  }
}

export async function notifyTelegramVoucher(input: {
  orderId: string;
  customerName: string;
  totalCop: number;
  paymentReference: string;
  paymentMethodName?: string | null;
}): Promise<void> {
  try {
    const cfg = await shouldNotify("tg_voucher");
    if (!cfg) return;
    await sendTelegramNotification({
      text: buildTelegramVoucherHtml(input),
      overrideToken: cfg.botToken,
      overrideChatId: cfg.chatId,
    });
  } catch (err) {
    console.error("[Telegram] notifyTelegramVoucher:", err);
  }
}

export async function notifyTelegramPaymentConfirmed(input: {
  orderId: string;
  customerName?: string | null;
  totalCop?: number | null;
  paymentMethodName?: string | null;
  reference?: string | null;
  gateway?: string | null;
}): Promise<void> {
  try {
    const cfg = await shouldNotify("tg_payment_confirmed");
    if (!cfg) return;
    await sendTelegramNotification({
      text: buildTelegramPaymentConfirmedHtml(input),
      overrideToken: cfg.botToken,
      overrideChatId: cfg.chatId,
    });
  } catch (err) {
    console.error("[Telegram] notifyTelegramPaymentConfirmed:", err);
  }
}

export async function notifyTelegramStatusChange(input: {
  orderId: string;
  customerName: string;
  status: string;
  totalCop?: number | null;
  guia?: string | null;
}): Promise<void> {
  try {
    const cfg = await shouldNotify("tg_status_change");
    if (!cfg) return;
    await sendTelegramNotification({
      text: buildTelegramStatusChangeHtml(input),
      overrideToken: cfg.botToken,
      overrideChatId: cfg.chatId,
    });
  } catch (err) {
    console.error("[Telegram] notifyTelegramStatusChange:", err);
  }
}
