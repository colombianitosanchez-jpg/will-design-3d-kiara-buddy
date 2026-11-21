import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockState = {
  events: { tg_new_order: true } as Record<string, unknown>,
  secrets: [
    { key: "telegram_bot_token", value: " 123456:TOKEN_PRUEBA " },
    { key: "telegram_chat_id", value: " -100999888 " },
  ],
};

vi.mock("@/integrations/supabase/client.server", () => ({
  supabaseAdmin: {
    from: (table: string) => {
      if (table === "notification_settings") {
        return {
          select: () => ({
            order: () => ({
              limit: () => ({
                maybeSingle: async () => ({
                  data: { events: mockState.events, templates: {} },
                  error: null,
                }),
              }),
            }),
          }),
        };
      }
      if (table === "integration_secrets") {
        return {
          select: () => ({
            in: async () => ({
              data: mockState.secrets,
              error: null,
            }),
          }),
        };
      }
      throw new Error(`Unexpected table ${table}`);
    },
  },
}));

describe("telegram.server", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    mockState.events = { tg_new_order: true };
    mockState.secrets = [
      { key: "telegram_bot_token", value: " 123456:TOKEN_PRUEBA " },
      { key: "telegram_chat_id", value: " -100999888 " },
    ];
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it("lee y limpia credenciales de integration_secrets en getTelegramConfig", async () => {
    const { getTelegramConfig } = await import("./telegram.server");
    const cfg = await getTelegramConfig();

    expect(cfg.botToken).toBe("123456:TOKEN_PRUEBA");
    expect(cfg.chatId).toBe("-100999888");
    expect(cfg.events).toEqual({ tg_new_order: true });
  });

  it("reintenta en texto plano si Telegram responde HTTP 400 con parse_mode HTML", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response("Bad Request: can't parse entities", { status: 400 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ ok: true }), { status: 200 }));
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const { sendTelegramNotification } = await import("./telegram.server");
    const res = await sendTelegramNotification({
      text: '<b>Nuevo</b> &amp; <a href="https://willdesign3d.co">Ver</a>',
    });

    expect(res.ok).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const secondCallBody = JSON.parse(String(fetchMock.mock.calls[1]?.[1]?.body));
    expect(secondCallBody.parse_mode).toBeUndefined();
    expect(secondCallBody.text).toBe("Nuevo & Ver: https://willdesign3d.co");
  });

  it("envía alerta de nuevo pedido cuando tg_new_order está activo y omite si está desactivado", async () => {
    const fetchMock = vi.fn().mockImplementation(
      async () => new Response(JSON.stringify({ ok: true }), { status: 200 }),
    );
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const { notifyTelegramNewOrder } = await import("./telegram.server");

    await notifyTelegramNewOrder({
      orderId: "11111111-2222-4333-8444-555555555555",
      customerName: "Laura",
      customerPhone: "3004150204",
      customerEmail: null,
      shippingAddress: "cra 28",
      shippingCity: "bogota",
      totalCop: 540000,
      paymentMethodName: "Nequi",
      items: [{ product_name: "Servicio: Impresión 3D", quantity: 1, unit_price_cop: 540000 }],
      sourceLabel: "Carrito Web",
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const sentPayload = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body));
    expect(sentPayload.chat_id).toBe("-100999888");
    expect(sentPayload.text).toContain("Carrito Web");
    expect(sentPayload.text).toContain("Laura");

    mockState.events = { tg_new_order: false };
    await notifyTelegramNewOrder({
      orderId: "11111111-2222-4333-8444-555555555555",
      customerName: "Laura",
      totalCop: 540000,
      items: [{ product_name: "PLA +", quantity: 1, unit_price_cop: 540000 }],
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
