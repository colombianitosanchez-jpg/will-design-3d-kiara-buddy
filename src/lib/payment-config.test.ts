import { describe, expect, it } from "vitest";
import {
  buildWompiChecksumInput,
  getCryptoExplorerUrl,
  getWompiWebhookUrl,
  paymentCategoryForType,
  paymentCategoryLabel,
  paymentMethodUpsertSchema,
  sanitizePublicPaymentConfig,
} from "./payment-config";

describe("payment-config", () => {
  it("clasifica correctamente las 4 categorías de métodos de pago", () => {
    expect(paymentCategoryForType("gateway_redirect")).toBe("automatic");
    expect(paymentCategoryForType("gateway")).toBe("automatic");
    expect(paymentCategoryForType("manual_transfer")).toBe("manual");
    expect(paymentCategoryForType("crypto")).toBe("crypto");
    expect(paymentCategoryForType("cash_on_delivery")).toBe("cash");
    expect(paymentCategoryForType("cash_point")).toBe("cash");
    expect(paymentCategoryLabel("crypto")).toContain("Cripto");
  });

  it("exige URL HTTPS válida de payment_url para pasarelas aunque tengan Wompi activo", () => {
    const missingUrl = paymentMethodUpsertSchema.safeParse({
      name: "Wompi Tarjetas",
      type: "gateway_redirect",
      config: {
        is_wompi: true,
        wompi_public_key: "pub_prod_123456",
        wompi_env: "production",
      },
    });
    expect(missingUrl.success).toBe(false);

    const legacyGatewayMissingUrl = paymentMethodUpsertSchema.safeParse({
      name: "Wompi Antiguo",
      type: "gateway",
      config: {
        is_wompi: true,
        wompi_public_key: "pub_test_123",
      },
    });
    expect(legacyGatewayMissingUrl.success).toBe(false);

    const insecureHttpUrl = paymentMethodUpsertSchema.safeParse({
      name: "Wompi HTTP",
      type: "gateway_redirect",
      config: {
        payment_url: "http://checkout.wompi.co/l/test",
      },
    });
    expect(insecureHttpUrl.success).toBe(false);

    const validGateway = paymentMethodUpsertSchema.safeParse({
      name: "Wompi",
      type: "gateway_redirect",
      config: {
        is_wompi: true,
        wompi_public_key: "pub_prod_123456",
        payment_url: "https://checkout.wompi.co/l/abc123",
      },
    });
    expect(validGateway.success).toBe(true);
  });

  it("genera enlaces válidos a exploradores de blockchain TRC20/BEP20", () => {
    expect(getCryptoExplorerUrl("TRC20", "TQn9Y2khEsLJW1ChVWFMSMeRDow5KcbLSE")).toBe(
      "https://tronscan.org/#/address/TQn9Y2khEsLJW1ChVWFMSMeRDow5KcbLSE",
    );
    expect(getCryptoExplorerUrl("BEP20", "0x71C7656EC7ab88b098defB751B7401B5f6d8976F")).toBe(
      "https://bscscan.com/address/0x71C7656EC7ab88b098defB751B7401B5f6d8976F",
    );
    expect(getCryptoExplorerUrl("TRC20", "short")).toBeNull();
  });

  it("elimina cualquier llave privada o secreto de config pública", () => {
    const clean = sanitizePublicPaymentConfig({
      is_wompi: true,
      wompi_public_key: "pub_test_123",
      wompi_env: "sandbox",
      wompi_events_secret: "prv_secret_leak",
      wompi_integrity_secret: "int_secret_leak",
      api_key: "secret_key",
      require_proof: true,
      account_number: "3001234567",
    });
    expect(clean.wompi_public_key).toBe("pub_test_123");
    expect(clean.require_proof).toBe(true);
    expect(clean.account_number).toBe("3001234567");
    expect((clean as Record<string, unknown>).wompi_events_secret).toBeUndefined();
    expect((clean as Record<string, unknown>).wompi_integrity_secret).toBeUndefined();
    expect((clean as Record<string, unknown>).api_key).toBeUndefined();
  });

  it("arma la URL del webhook de Wompi y la cadena oficial de verificación SHA256", () => {
    expect(getWompiWebhookUrl("https://will-design-3d.lovable.app/")).toBe(
      "https://will-design-3d.lovable.app/api/public/wompi-webhook",
    );

    const raw = buildWompiChecksumInput(
      {
        transaction: {
          id: "1234-1610",
          status: "APPROVED",
          amount_in_cents: 8400000,
        },
      },
      ["transaction.id", "transaction.status", "transaction.amount_in_cents"],
      1700000000,
      "test_events_secret",
    );
    expect(raw).toBe("1234-1610APPROVED84000001700000000test_events_secret");
  });
});
