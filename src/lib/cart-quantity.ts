/** Las cantidades de servicios pertenecen a su cotización; cambiarlas exige recalcular. */
export function canEditCartQuantity(item: { kind?: "product" | "service" }): boolean {
  return item.kind !== "service";
}

export function mergeCartLine<T extends { kind?: "product" | "service"; quantity: number }>(existing: T, incoming: T): T {
  if (!canEditCartQuantity(incoming)) return incoming;
  return { ...existing, quantity: Math.min(99, existing.quantity + incoming.quantity) };
}

/** No convertir una solicitud de varias unidades en un pedido de una sin avisar. */
export function assertServiceOrderQuantity(service: { allow_quantity: boolean; name: string }, quantity: number): void {
  if (!service.allow_quantity && quantity !== 1) {
    throw new Error(`${service.name} solo admite una unidad por cotización. Vuelve al cotizador antes de confirmar.`);
  }
}