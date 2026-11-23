/** Helpers puros para la cascada de proveedores y límites de historial público de Kiara. */

export const PUBLIC_HISTORY_LIMIT = 6;
export const PUBLIC_MESSAGE_MAX_CHARS = 1500;

/** Códigos HTTP que deben provocar el salto al siguiente proveedor de la cascada. */
export function shouldFallback(status: number): boolean {
  return (
    status === 429 ||
    status === 402 ||
    status >= 500 ||
    status === 401 ||
    status === 403 ||
    status === 400 ||
    status === 404
  );
}

/** Acota el historial público a los últimos 6 turnos y 1.500 caracteres por mensaje. */
export function boundPublicMessages<T extends { role: "user" | "assistant"; content: string }>(
  messages: T[],
): T[] {
  return messages.slice(-PUBLIC_HISTORY_LIMIT).map((m) => ({
    ...m,
    content: m.content.slice(0, PUBLIC_MESSAGE_MAX_CHARS),
  }));
}

export function formatProviderErrorDetail(ok: boolean, status: number): string {
  if (ok) return "sin cuerpo";
  if (status === 402) return "HTTP 402 (sin saldo)";
  if (status === 429) return "HTTP 429 (límite de tasa)";
  return `HTTP ${status}`;
}
