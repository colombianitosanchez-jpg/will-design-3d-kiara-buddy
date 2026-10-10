import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Checkbox } from "@/components/ui/checkbox";
import { listPublicPaymentMethods, type PublicPaymentMethod } from "@/lib/payment-methods.functions";
import { paymentTypeLabel } from "@/lib/payment-types";

let cache: Promise<PublicPaymentMethod[]> | null = null;

export function usePaymentMethods() {
  const load = useServerFn(listPublicPaymentMethods);
  const [methods, setMethods] = useState<PublicPaymentMethod[]>([]);
  useEffect(() => {
    let alive = true;
    cache ??= load({}).catch(() => {
      cache = null;
      return [];
    });
    void cache.then((m) => alive && setMethods(m));
    return () => {
      alive = false;
    };
  }, [load]);
  return methods;
}

/**
 * Selector de métodos de pago permitidos.
 * `value` vacío = todos los activos. Con `inheritLabel`, `null` = hereda del producto.
 */
export function PaymentMethodsPicker({
  value,
  onChange,
  inheritLabel,
}: {
  value: string[] | null;
  onChange: (v: string[] | null) => void;
  inheritLabel?: string;
}) {
  const methods = usePaymentMethods();
  const inherits = value === null;
  const list = value ?? [];

  if (!methods.length) {
    return <p className="text-xs text-muted-foreground">No hay métodos de pago activos. Créalos en Panel → Pagos.</p>;
  }

  return (
    <div className="grid gap-2 text-sm">
      {inheritLabel && (
        <label className="inline-flex items-center gap-2">
          <Checkbox checked={inherits} onCheckedChange={(c) => onChange(c ? null : [])} />
          {inheritLabel}
        </label>
      )}
      {!inherits && (
        <>
          <label className="inline-flex items-center gap-2 font-semibold">
            <Checkbox checked={list.length === 0} onCheckedChange={(c) => c && onChange([])} />
            Todos los métodos activos
          </label>
          <div className="grid gap-1.5 sm:grid-cols-2">
            {methods.map((m) => (
              <label key={m.id} className="inline-flex items-center gap-2 rounded-lg border border-border px-2 py-1.5">
                <Checkbox
                  checked={list.includes(m.id)}
                  onCheckedChange={(c) =>
                    onChange(c ? [...list, m.id] : list.filter((id) => id !== m.id))
                  }
                />
                <span>
                  {m.name}
                  <span className="block text-[11px] text-muted-foreground">{paymentTypeLabel(m.type)}</span>
                </span>
              </label>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
