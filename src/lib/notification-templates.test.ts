import { describe, expect, it } from "vitest";
import {
  buildCartSuccessWhatsappMessage,
  buildCustomerWhatsAppUrl,
  buildQuickOrderWhatsappMessage,
  buildTelegramOrderHtml,
  buildTelegramPaymentConfirmedHtml,
  buildTelegramQuoteHtml,
  buildTelegramStatusChangeHtml,
  buildTelegramVoucherHtml,
  buildWhatsAppApiUrl,
  escapeTelegramHtml,
  expandNotificationTemplate,
  formatOrderCode,
  isTelegramEventEnabled,
  normalizeQueueStatusLabel,
  normalizeWhatsAppDigits,
  PUBLIC_PANEL_ORDERS_URL,
} from "./notification-templates";

describe("notification-templates", () => {
  it("formatea el código corto de pedido tipo #WD-XXXXXXXX", () => {
    expect(formatOrderCode("a1b2c3d4-1111-2222-3333-444455556666")).toBe("#WD-A1B2C3D4");
    expect(formatOrderCode("#wd-1234abcd")).toBe("#WD-1234ABCD");
  });

  it("normaliza teléfonos colombianos de 10 dígitos y construye enlaces wa.me y api.whatsapp.com", () => {
    expect(normalizeWhatsAppDigits("300 123 4567")).toBe("573001234567");
    expect(normalizeWhatsAppDigits("+57 315 672 4474")).toBe("573156724474");
    expect(normalizeWhatsAppDigits("123")).toBe("");

    const url = buildCustomerWhatsAppUrl("3001234567", "Hola Juan");
    expect(url).toBe("https://wa.me/573001234567?text=Hola%20Juan");
    expect(buildCustomerWhatsAppUrl("", "Hola")).toBeNull();

    const apiUrl = buildWhatsAppApiUrl("3001234567", "Hola Juan");
    expect(apiUrl).toBe("https://api.whatsapp.com/send?phone=573001234567&text=Hola%20Juan");
    expect(buildWhatsAppApiUrl("", "Hola")).toBeNull();
  });

  it("expande todas las variables {{nombre}}, {{cliente}}, {{pedido}}, {{estado}}, {{total}}, {{guia}} y {{nota}}", () => {
    const res = expandNotificationTemplate(
      "Hola {{nombre}} ({{cliente}}), tu pedido {{pedido}} por {{total}} pasó a {{estado}}. {{guia}} {{nota}}",
      {
        customerName: "Camila Torres",
        orderId: "9f8e7d6c-0000-0000-0000-000000000000",
        status: "enviado",
        totalCop: 120000,
        guia: "SERVI-9988",
        note: "Despachado hoy",
      },
    );
    expect(res).toContain("Hola Camila Torres (Camila Torres)");
    expect(res).toContain("#WD-9F8E7D6C");
    expect(res).toContain("enviado");
    expect(res).toContain("Guía de rastreo: SERVI-9988.");
    expect(res).toContain("Despachado hoy");
    expect(res).toContain("$120");
  });

  it("genera el mensaje de pedido rápido por WhatsApp incluyendo #WD-código y enlace corto", () => {
    const msg = buildQuickOrderWhatsappMessage({
      orderCode: "#WD-ABCD1234",
      totalCop: 85000,
      productName: "Soporte Audífonos 3D",
      variantName: "Negro Mate",
      customerName: "Mateo Ruiz",
      shippingCity: "Bogotá",
      shareUrl: "https://will-design-3d.lovable.app/t/soporte",
    });
    expect(msg).toContain("Hola Will Design 3D, acabo de registrar mi pedido #WD-ABCD1234");
    expect(msg).toContain("Soporte Audífonos 3D (Negro Mate)");
    expect(msg).toContain("Mateo Ruiz (Bogotá)");
    expect(msg).toContain("https://will-design-3d.lovable.app/t/soporte");
  });

  it("conserva el mensaje preconfigurado con {{pedido}} sin mover el enlace de previsualización", () => {
    const msg = buildQuickOrderWhatsappMessage({
      orderCode: "#WD-99887766",
      totalCop: 84000,
      productName: "PLA +",
      customerName: "Laura",
      shareUrl: "https://will-design-3d.lovable.app/t/pla",
      configuredMessage:
        "Hola, soy {{nombre}} y quiero confirmar mi pedido {{pedido}} de PLA +\n\nhttps://will-design-3d.lovable.app/t/pla",
    });
    expect(msg).toBe(
      "Hola, soy Laura y quiero confirmar mi pedido #WD-99887766 de PLA +\n\nhttps://will-design-3d.lovable.app/t/pla",
    );
  });

  it("escapa HTML en alertas de Telegram y evalúa flags con fallback true", () => {
    expect(escapeTelegramHtml("A <B> & C")).toBe("A &lt;B&gt; &amp; C");
    expect(isTelegramEventEnabled({}, "tg_new_order")).toBe(true);
    expect(isTelegramEventEnabled({}, "tg_new_quote")).toBe(true);
    expect(isTelegramEventEnabled({ tg_new_order: false }, "tg_new_order")).toBe(false);

    const html = buildTelegramOrderHtml({
      orderId: "12345678-aaaa-bbbb-cccc-ddddeeeeffff",
      customerName: "Ana <VIP>",
      customerPhone: "3105551234",
      totalCop: 95000,
      paymentMethodName: "Nequi",
      items: [{ product_name: "Figura 3D", quantity: 2, unit_price_cop: 47500 }],
    });
    expect(html).toContain("#WD-12345678");
    expect(html).toContain("Ana &lt;VIP&gt;");
    expect(html).toContain("2x Figura 3D");
    expect(html).toContain("/panel/pedidos");

    expect(
      buildTelegramVoucherHtml({
        orderId: "12345678",
        customerName: "Ana",
        totalCop: 95000,
        paymentReference: "NEQ-123",
      }),
    ).toContain("NEQ-123");

    expect(
      buildTelegramPaymentConfirmedHtml({
        orderId: "12345678",
        gateway: "Wompi",
        reference: "WMP-99",
      }),
    ).toContain("Wompi");

    expect(
      buildTelegramStatusChangeHtml({
        orderId: "12345678",
        customerName: "Ana",
        status: "enviado",
        guia: "TCC-44",
      }),
    ).toContain("TCC-44");
  });

  it("genera el HTML de Telegram para nuevas cotizaciones 3D con datos del cliente y archivo", () => {
    const withFile = buildTelegramQuoteHtml({
      quoteId: "q-123",
      serviceName: "Impresión FDM",
      customerName: "Carlos <Pro>",
      customerPhone: "3156724474",
      customerEmail: "carlos@ejemplo.com",
      totalCop: 145000,
      fileName: "engranaje_v2.stl",
      answers: [
        { label: "Material", value: "PETG" },
        { label: "Relleno", value: "40%" },
      ],
    });
    expect(withFile).toContain("<b>📋 NUEVA COTIZACIÓN 3D SOLICITADA</b>");
    expect(withFile).toContain("<b>Servicio:</b> Impresión FDM");
    expect(withFile).toContain("<b>Cliente:</b> Carlos &lt;Pro&gt;");
    expect(withFile).toContain("<b>WhatsApp / Tel:</b> 3156724474");
    expect(withFile).toContain("<b>Correo:</b> carlos@ejemplo.com");
    expect(withFile).toContain("<b>Total Estimado:</b> $145.000");
    expect(withFile).toContain("<b>Archivo 3D adjunto:</b> engranaje_v2.stl");
    expect(withFile).toContain("• Material: PETG");
    expect(withFile).toContain("• Relleno: 40%");
    expect(withFile).toContain(`${PUBLIC_PANEL_ORDERS_URL}?tab=cotizaciones`);

    const withoutFile = buildTelegramQuoteHtml({
      serviceName: "Diseño 3D",
      customerName: "Laura",
      totalCop: 60000,
      fileName: null,
    });
    expect(withoutFile).toContain("<b>Archivo 3D adjunto:</b> Sin archivo adjunto");
    expect(withoutFile).toContain(`${PUBLIC_PANEL_ORDERS_URL}?tab=cotizaciones`);
  });

  it("genera el mensaje enriquecido de WhatsApp para pedidos del carrito (único o dividido)", () => {
    const msg = buildCartSuccessWhatsappMessage({
      orderCode: "a1b2c3d4-1111-2222-3333-444455556666",
      totalCop: 215000,
      customerName: "Sofía Mendoza",
      shippingCity: "Bogotá",
      shippingAddress: "Cra 28 #86-13",
      paymentMethodName: "Nequi",
      items: [
        { name: "Filamento PLA+", quantity: 2, unitPriceCop: 85000 },
        { name: "Servicio: Impresión FDM", quantity: 1, unitPriceCop: 45000 },
      ],
      trackingUrl: "https://willdesign3d.co/pedido/tok-123",
      customNote: "Entregar en portería",
    });

    expect(msg).toContain("#WD-A1B2C3D4");
    expect(msg).toContain("Sofía Mendoza (Bogotá)");
    expect(msg).toContain("Cra 28 #86-13");
    expect(msg).toContain("Método de pago: Nequi");
    expect(msg).toContain("• 2x Filamento PLA+ — $170.000");
    expect(msg).toContain("• 1x Servicio: Impresión FDM — $45.000");
    expect(msg).toContain("Total: $215.000");
    expect(msg).toContain("Notas: Entregar en portería");
    expect(msg).toContain("https://willdesign3d.co/pedido/tok-123");
  });

  it("mapea estados de notifications_queue a etiquetas en español", () => {
    expect(normalizeQueueStatusLabel("sent").label).toBe("Enviado");
    expect(normalizeQueueStatusLabel("manual").label).toBe("Manual");
    expect(normalizeQueueStatusLabel("failed").label).toBe("Error");
    expect(normalizeQueueStatusLabel("pending").label).toBe("Pendiente");
  });
});
