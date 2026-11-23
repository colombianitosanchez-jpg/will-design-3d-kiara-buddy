import { describe, expect, it } from "vitest";
import {
  PUBLIC_HISTORY_LIMIT,
  PUBLIC_MESSAGE_MAX_CHARS,
  boundPublicMessages,
  formatProviderErrorDetail,
  shouldFallback,
} from "./kiara-routing";

describe("kiara-routing fallback & history bounds", () => {
  it("incluye HTTP 402 (sin saldo) y códigos transitorios/auth en shouldFallback", () => {
    for (const status of [400, 401, 402, 403, 404, 429, 500, 502, 503]) {
      expect(shouldFallback(status)).toBe(true);
    }
    expect(shouldFallback(200)).toBe(false);
    expect(shouldFallback(409)).toBe(false);
  });

  it("formatea claramente HTTP 402 y HTTP 429 para logs de cascada", () => {
    expect(formatProviderErrorDetail(true, 200)).toBe("sin cuerpo");
    expect(formatProviderErrorDetail(false, 402)).toBe("HTTP 402 (sin saldo)");
    expect(formatProviderErrorDetail(false, 429)).toBe("HTTP 429 (límite de tasa)");
    expect(formatProviderErrorDetail(false, 503)).toBe("HTTP 503");
  });

  it("acota el historial público a los últimos 6 turnos y 1.500 caracteres por mensaje", () => {
    expect(PUBLIC_HISTORY_LIMIT).toBe(6);
    expect(PUBLIC_MESSAGE_MAX_CHARS).toBe(1500);

    const messages = Array.from({ length: 12 }, (_, i) => ({
      role: (i % 2 === 0 ? "user" : "assistant") as "user" | "assistant",
      content: i === 11 ? "a".repeat(2000) : `msg-${i + 1}`,
    }));

    const bounded = boundPublicMessages(messages);
    expect(bounded).toHaveLength(6);
    expect(bounded[0].content).toBe("msg-7");
    expect(bounded[4].content).toBe("msg-11");
    expect(bounded[5].content).toHaveLength(1500);
  });
});
