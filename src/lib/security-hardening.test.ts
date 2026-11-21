import { beforeEach, describe, expect, test, vi } from "vitest";
import {
  createRateLimiter,
  extractClientIpFromHeaders,
  RATE_LIMIT_ERROR_MESSAGE,
} from "./rate-limit.server";
import {
  ALLOWED_QUOTE_EXT,
  sanitizeAndValidateQuoteFileName,
} from "./quote-upload-validation";

const mockInsertOrder = vi.fn();
const mockInsertOrderItems = vi.fn();
const mockCatalogIn = vi.fn();

vi.mock("@/integrations/supabase/client.server", () => ({
  supabaseAdmin: {
    from: (table: string) => {
      if (table === "products") {
        return {
          select: () => ({
            in: mockCatalogIn,
          }),
        };
      }
      if (table === "orders") {
        return {
          insert: (payload: Record<string, unknown>) => {
            mockInsertOrder(payload);
            return {
              select: () => ({
                single: async () => ({
                  data: { id: "11111111-2222-3333-4444-555555555555", public_token: "tok-123" },
                  error: null,
                }),
              }),
            };
          },
        };
      }
      if (table === "order_items") {
        return {
          insert: (rows: unknown[]) => {
            mockInsertOrderItems(rows);
            return Promise.resolve({ error: null });
          },
        };
      }
      return {};
    },
  },
}));

vi.mock("@/lib/telegram.server", () => ({
  notifyTelegramNewOrder: vi.fn(async () => {}),
}));

describe("Rate limiting por IP para pedidos y cotizaciones", () => {
  test("extrae IP desde cf-connecting-ip y x-forwarded-for", () => {
    expect(
      extractClientIpFromHeaders(new Headers({ "cf-connecting-ip": "203.0.113.10" })),
    ).toBe("203.0.113.10");

    expect(
      extractClientIpFromHeaders(
        new Headers({ "x-forwarded-for": "198.51.100.2, 10.0.0.1" }),
      ),
    ).toBe("198.51.100.2");

    expect(extractClientIpFromHeaders(new Headers())).toBe("anon");
  });

  test("permite hasta 10 solicitudes por minuto por IP y rechaza la 11ª en ventana móvil", () => {
    let now = 1_700_000_000_000;
    const limiter = createRateLimiter({ maxRequests: 10, windowMs: 60_000, now: () => now });

    for (let i = 0; i < 10; i++) {
      expect(() => limiter.assert("quotes:190.10.1.5", now)).not.toThrow();
    }

    expect(() => limiter.assert("quotes:190.10.1.5", now + 1000)).toThrow(
      RATE_LIMIT_ERROR_MESSAGE,
    );

    // Otra IP no queda bloqueada
    expect(() => limiter.assert("quotes:190.10.1.99", now + 1000)).not.toThrow();

    // Tras pasar 60 segundos vuelve a permitir
    now += 60_001;
    expect(() => limiter.assert("quotes:190.10.1.5", now)).not.toThrow();
  });
});

describe("Sanitización de archivos en cotizaciones 3D", () => {
  test("rechaza archivos .svg y formatos ejecutables", () => {
    expect(ALLOWED_QUOTE_EXT.test("malicioso.svg")).toBe(false);
    expect(() => sanitizeAndValidateQuoteFileName("malicioso.svg")).toThrow(
      "Tipo de archivo no permitido",
    );
    expect(() => sanitizeAndValidateQuoteFileName("payload.SVG")).toThrow(
      "Tipo de archivo no permitido",
    );
    expect(() => sanitizeAndValidateQuoteFileName("script.html")).toThrow(
      "Tipo de archivo no permitido",
    );
  });

  test("acepta formatos 3D válidos y reemplaza caracteres inseguros por _", () => {
    expect(sanitizeAndValidateQuoteFileName("pieza motor (v2).stl")).toBe(
      "pieza_motor__v2_.stl",
    );
    expect(sanitizeAndValidateQuoteFileName("caja/../soporte.3mf")).toBe(
      "caja_._soporte.3mf",
    );
    expect(sanitizeAndValidateQuoteFileName("plano.step")).toBe("plano.step");
    expect(sanitizeAndValidateQuoteFileName("corte.dxf")).toBe("corte.dxf");
  });
});

describe("Validación y acotamiento en Kiara create_order", () => {
  beforeEach(() => {
    mockInsertOrder.mockReset();
    mockInsertOrderItems.mockReset();
    mockCatalogIn.mockReset();
  });

  test("rechaza con error controlado cuando el total es <= 0 (productos inexistentes) sin insertar pedido", async () => {
    mockCatalogIn.mockResolvedValueOnce({ data: [], error: null });
    const { runKiaraTool } = await import("./kiara-tools.server");

    const outcome = await runKiaraTool(
      "create_order",
      JSON.stringify({
        customer_name: "Ana",
        customer_email: "ana@test.com",
        shipping_address: "Calle 10",
        items: [{ product_name: "Producto inventado", quantity: 2 }],
      }),
    );

    expect(outcome.data).toBeNull();
    expect(outcome.result).toEqual({ error: "total_invalido" });
    expect(mockInsertOrder).not.toHaveBeenCalled();
    expect(mockInsertOrderItems).not.toHaveBeenCalled();
  });

  test("acota cantidades a 1..99 y trunca product_name, customer_name, shipping_address y notes", async () => {
    mockCatalogIn.mockResolvedValueOnce({
      data: [
        {
          id: "prod-1",
          name: "Filamento " + "A".repeat(180),
          slug: "filamento-pla",
          price_cop: 50_000,
          active: true,
        },
      ],
      error: null,
    });

    const { runKiaraTool } = await import("./kiara-tools.server");
    const longName = "N".repeat(140);
    const longAddress = "D".repeat(250);
    const longNotes = "Z".repeat(700);

    const outcome = await runKiaraTool(
      "create_order",
      JSON.stringify({
        customer_name: longName,
        customer_email: "ana@test.com",
        shipping_address: longAddress,
        notes: longNotes,
        items: [{ product_slug: "filamento-pla", product_name: "P".repeat(200), quantity: 500 }],
      }),
    );

    expect(mockInsertOrder).toHaveBeenCalledTimes(1);
    const orderArg = mockInsertOrder.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(String(orderArg.customer_name).length).toBe(100);
    expect(String(orderArg.shipping_address).length).toBe(200);
    expect(String(orderArg.notes).length).toBe(500);
    expect(orderArg.total_cop).toBe(99 * 50_000);

    const itemsArg = mockInsertOrderItems.mock.calls[0]?.[0] as Array<Record<string, unknown>>;
    expect(itemsArg[0]?.quantity).toBe(99);
    expect(String(itemsArg[0]?.product_name).length).toBe(150);
    expect((outcome.data as { total_cop: number }).total_cop).toBe(99 * 50_000);
  });
});
