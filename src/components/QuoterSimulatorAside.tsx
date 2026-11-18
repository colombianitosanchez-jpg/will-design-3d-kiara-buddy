import { Button } from "@/components/ui/button";
import { useMemo } from "react";
import {
  computeQuote,
  formatCOP,
  isOn,
  type QuoterService,
  type QuoterValues,
} from "@/lib/quoter";
import { formatOptionPriceBadge } from "@/lib/quoter-ui";
import type { QuotingVars } from "@/lib/quoting-vars";
import { Switch } from "@/components/ui/switch";
import { Calculator, MessageSquare, Minus, Plus } from "lucide-react";

const inputCls =
  "w-full rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring";

export function QuoterSimulatorAside({
  service,
  quotingVars,
  values,
  onValueChange,
  quantity,
  onQuantityChange,
}: {
  service: QuoterService;
  quotingVars?: QuotingVars;
  values: QuoterValues;
  onValueChange: (key: string, val: string) => void;
  quantity: number;
  onQuantityChange: (qty: number) => void;
}) {
  const preview = useMemo(
    () => computeQuote(service, values, quantity, quotingVars),
    [service, values, quantity, quotingVars],
  );

  const activeFields = service.fields.filter((f) => f.is_active !== false);

  return (
    <aside className="min-w-0 h-fit border-l border-border bg-background p-4 xl:sticky xl:top-6 space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-lg font-bold">
          <Calculator className="h-5 w-5 text-[var(--brand-orange)]" />
          Simulador en vivo
        </h3>
        <span className="rounded-md bg-muted px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
          {service.has_calculator === false ? "Solo WhatsApp" : "Cotizador activo"}
        </span>
      </div>

      {service.has_calculator === false && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-3 text-xs text-amber-900 space-y-1">
          <p className="font-bold flex items-center gap-1.5">
            <MessageSquare className="h-3.5 w-3.5 shrink-0" /> Modo WhatsApp directo
          </p>
          <p>
            En la web pública no se mostrará calculadora para este servicio; el botón enviará el mensaje personalizado de WhatsApp.
          </p>
        </div>
      )}

      {service.has_calculator !== false && <div className="space-y-4">
        {activeFields.map((f) => {
          const current = values[f.key] ?? "";
          if (f.input_type === "slider") {
            const val = Number.isFinite(Number(current)) ? Number(current) : f.min_value;
            return (
              <div key={f.id} className="space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-foreground">{f.label}</span>
                  <span className="rounded-md bg-secondary px-2 py-0.5 text-xs font-bold text-primary-foreground tabular-nums">
                    {val}
                    {f.unit ? ` ${f.unit}` : ""}
                  </span>
                </div>
                <input
                  type="range"
                  min={f.min_value}
                  max={f.max_value}
                  step={f.step_value || 1}
                  value={val}
                  onChange={(e) => onValueChange(f.key, e.target.value)}
                  aria-label={`Simulador ${f.label}`}
                  className="w-full accent-[var(--brand-orange)] cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-muted-foreground tabular-nums">
                  <span>
                    {f.min_value}
                    {f.unit ? ` ${f.unit}` : ""}
                  </span>
                  <span>
                    {f.max_value}
                    {f.unit ? ` ${f.unit}` : ""}
                  </span>
                </div>
              </div>
            );
          }

          if (f.input_type === "select") {
            return (
              <div key={f.id} className="space-y-1.5">
                <span className="text-xs font-bold text-foreground block">{f.label}</span>
                <div className="grid grid-cols-2 gap-1.5">
                  {f.options.map((opt) => {
                    const active = current === opt.value;
                    const priceBadge = formatOptionPriceBadge(opt);
                    return (
                      <Button variant="ghost"
                        key={opt.value}
                        type="button"
                        onClick={() => onValueChange(f.key, opt.value)}
                        className={`rounded-xl border p-2 text-left text-xs transition ${
                          active
                            ? "border-[var(--brand-orange)] bg-[color-mix(in_oklab,var(--brand-orange)_10%,white)] font-bold"
                            : "border-border bg-card hover:bg-muted"
                        }`}
                      >
                        <div className="truncate">{opt.label}</div>
                        {priceBadge && (
                          <div className="text-[10px] font-normal text-muted-foreground tabular-nums">
                            {priceBadge}
                          </div>
                        )}
                      </Button>
                    );
                  })}
                </div>
              </div>
            );
          }

          if (f.input_type === "toggle") {
            const checked = isOn(current);
            return (
              <div
                key={f.id}
                className="flex items-center justify-between gap-2 rounded-xl border border-border bg-card px-3 py-2"
              >
                <span className="text-xs font-bold text-foreground">{f.label}</span>
                <Switch
                  aria-label={`Simulador ${f.label}`}
                  checked={checked}
                  onCheckedChange={(on) => onValueChange(f.key, on ? "si" : "no")}
                />
              </div>
            );
          }

          return (
            <label key={f.id} className="block">
              <span className="text-xs font-bold text-foreground">{f.label}</span>
              <input
                type={f.input_type === "number" ? "number" : "text"}
                min={f.input_type === "number" ? f.min_value : undefined}
                max={f.input_type === "number" ? f.max_value : undefined}
                step={f.input_type === "number" ? f.step_value || 1 : undefined}
                value={current}
                onChange={(e) => onValueChange(f.key, e.target.value)}
                className={`mt-1 ${inputCls}`}
              />
            </label>
          );
        })}

        {service.allow_quantity && (
          <div className="flex items-center justify-between gap-2 rounded-xl border border-border bg-card px-3 py-2">
            <span className="text-xs font-bold text-foreground">Cantidad</span>
            <div className="flex items-center gap-2">
              <Button variant="ghost"
                type="button"
                onClick={() => onQuantityChange(Math.max(1, quantity - 1))}
                aria-label="Disminuir cantidad"
                className="rounded-full border border-border p-1 hover:bg-muted"
              >
                <Minus className="h-3.5 w-3.5" />
              </Button>
              <span className="w-8 text-center text-sm font-black tabular-nums">{quantity}</span>
              <Button variant="ghost"
                type="button"
                onClick={() => onQuantityChange(quantity + 1)}
                aria-label="Aumentar cantidad"
                className="rounded-full border border-border p-1 hover:bg-muted"
              >
                <Plus className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        )}
      </div>

      }
      {service.has_calculator !== false && <>
      {/* Desglose calculado */}
      <div className="space-y-1.5 border-t border-dashed border-border pt-3 text-xs">
        {preview.lines.map((line, idx) => (
          <div key={`${line.label}-${idx}`} className="flex justify-between gap-2 text-muted-foreground">
            <span className="truncate">
              {line.label}
              {line.detail ? ` · ${line.detail}` : ""}
            </span>
            <span className="whitespace-nowrap tabular-nums">{formatCOP(line.amount)}</span>
          </div>
        ))}
        {preview.multiplier !== 1 && (
          <div className="flex justify-between text-muted-foreground">
            <span>Multiplicador opciones</span>
            <span className="tabular-nums">×{preview.multiplier.toFixed(2)}</span>
          </div>
        )}
        {preview.margin_cop > 0 && (
          <div className="flex justify-between text-muted-foreground">
            <span>Margen ({service.margin_percent}%)</span>
            <span className="tabular-nums">{formatCOP(preview.margin_cop)}</span>
          </div>
        )}
        {preview.min_applied && (
          <p className="text-[11px] font-medium text-secondary">
            Se aplicó el precio mínimo ({formatCOP(service.min_price_cop)}).
          </p>
        )}
      </div>

      <div className="border-t border-border pt-3 flex items-baseline justify-between">
        <div>
          <span className="text-sm font-black">Total estimado</span>
          {preview.quantity > 1 && (
            <p className="text-[11px] text-muted-foreground tabular-nums">
              {formatCOP(preview.unit_price_cop)} c/u × {preview.quantity}
            </p>
          )}
        </div>
        <span role="status" aria-live="polite" className="break-words text-xl font-black text-primary tabular-nums">
          {formatCOP(preview.total_cop)}
        </span>
      </div>
      </>}
    </aside>
  );
}
