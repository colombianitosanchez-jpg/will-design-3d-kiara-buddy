import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  ArrowRight,
  Upload,
  CheckCircle2,
  X,
  AlertTriangle,
  Loader2,
  Printer,
  Sparkles,
  Package,
  PencilRuler,
  Scan,
  Paintbrush,
  Boxes,
  GraduationCap,
  ChevronLeft,
  Minus,
  Plus,
  type LucideIcon,
} from "lucide-react";
import kiaraAsset from "@/assets/kiara.asset.json";
import { siteContentQuery, getContactInfo, waLink } from "@/lib/catalog";
import { supabase } from "@/integrations/supabase/client";
import { createQuoteRequest } from "@/lib/quotes.functions";
import {
  quoterServicesQuery,
  defaultValuesFor,
  computeQuote,
  formatCOP,
  isOn,
  type QuoterService,
  type QuoterField,
  type QuoterValues,
} from "@/lib/quoter";

const ICONS: Record<string, LucideIcon> = {
  printer: Printer,
  sparkles: Sparkles,
  package: Package,
  "pencil-ruler": PencilRuler,
  scan: Scan,
  paintbrush: Paintbrush,
  boxes: Boxes,
  "graduation-cap": GraduationCap,
};

const MAX_BYTES = 50 * 1024 * 1024;
const ALLOWED_EXT = [".stl", ".obj", ".3mf", ".step", ".stp", ".pdf", ".jpg", ".jpeg", ".png"];

function validateFile(file: File): string | null {
  const name = file.name.toLowerCase();
  if (!ALLOWED_EXT.some((ext) => name.endsWith(ext)))
    return `Formato no permitido (“${file.name}”). Aceptamos .stl, .obj, .3mf, .step, .pdf, .jpg y .png.`;
  if (file.size > MAX_BYTES)
    return `El archivo pesa ${(file.size / 1024 / 1024).toFixed(1)} MB y el límite es 50 MB.`;
  return null;
}

const inputCls =
  "w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring";

/* ------------------------------- Campo dinámico ------------------------------ */

function FieldControl({
  field,
  value,
  onChange,
}: {
  field: QuoterField;
  value: string;
  onChange: (v: string) => void;
}) {
  if (field.input_type === "slider") {
    const v = Number(value) || field.min_value;
    return (
      <div>
        <div className="flex items-baseline justify-between">
          <span className="text-sm font-bold">{field.label}</span>
          <span className="rounded-full bg-[var(--brand-teal-deep)] px-3 py-0.5 text-xs font-black text-white">
            {v}
            {field.unit ? ` ${field.unit}` : ""}
          </span>
        </div>
        <input
          type="range"
          min={field.min_value}
          max={field.max_value}
          step={field.step_value}
          value={v}
          onChange={(e) => onChange(e.target.value)}
          aria-label={field.label}
          className="mt-3 w-full accent-[var(--brand-orange)]"
        />
        <div className="flex justify-between text-[11px] text-muted-foreground">
          <span>
            {field.min_value}
            {field.unit ? ` ${field.unit}` : ""}
          </span>
          <span>
            {field.max_value}
            {field.unit ? ` ${field.unit}` : ""}
          </span>
        </div>
        {field.help && <p className="mt-1 text-xs text-muted-foreground">{field.help}</p>}
      </div>
    );
  }

  if (field.input_type === "select") {
    return (
      <div>
        <span className="text-sm font-bold">{field.label}</span>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          {field.options.map((o) => {
            const active = o.value === value;
            return (
              <button
                type="button"
                key={o.value}
                onClick={() => onChange(o.value)}
                className={`rounded-xl border p-3 text-left text-sm transition ${
                  active
                    ? "border-[var(--brand-orange)] bg-[color-mix(in_oklab,var(--brand-orange)_10%,white)] font-bold"
                    : "border-border hover:bg-muted"
                }`}
              >
                {o.label}
                {o.add_cop ? (
                  <span className="mt-0.5 block text-[11px] text-muted-foreground">
                    +{formatCOP(o.add_cop)}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
        {field.help && <p className="mt-1 text-xs text-muted-foreground">{field.help}</p>}
      </div>
    );
  }

  if (field.input_type === "toggle") {
    const on = isOn(value);
    return (
      <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border p-3 hover:bg-muted">
        <input
          type="checkbox"
          checked={on}
          onChange={(e) => onChange(e.target.checked ? "si" : "no")}
          className="mt-0.5 h-4 w-4 accent-[var(--brand-orange)]"
        />
        <span className="text-sm">
          <span className="font-bold">{field.label}</span>
          {field.options[0]?.add_cop ? (
            <span className="ml-1 text-xs text-muted-foreground">
              (+{formatCOP(field.options[0].add_cop)})
            </span>
          ) : null}
          {field.help && <span className="block text-xs text-muted-foreground">{field.help}</span>}
        </span>
      </label>
    );
  }

  if (field.input_type === "number") {
    return (
      <label className="block">
        <span className="text-sm font-bold">{field.label}</span>
        <input
          type="number"
          min={field.min_value}
          max={field.max_value}
          step={field.step_value}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`mt-2 ${inputCls}`}
        />
        {field.help && <p className="mt-1 text-xs text-muted-foreground">{field.help}</p>}
      </label>
    );
  }

  return (
    <label className="block">
      <span className="text-sm font-bold">{field.label}</span>
      <input value={value} onChange={(e) => onChange(e.target.value)} className={`mt-2 ${inputCls}`} />
      {field.help && <p className="mt-1 text-xs text-muted-foreground">{field.help}</p>}
    </label>
  );
}

/* --------------------------------- Cotizador -------------------------------- */

export function Quoter({ initialServiceSlug }: { initialServiceSlug?: string } = {}) {
  const { data: services, isLoading } = useQuery(quoterServicesQuery());
  const { data: content } = useQuery(siteContentQuery());
  const contact = getContactInfo(content);
  const saveQuote = useServerFn(createQuoteRequest);

  const [serviceId, setServiceId] = useState<string | null>(null);
  const [values, setValues] = useState<QuoterValues>({});
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const service = useMemo(
    () => (services ?? []).find((s) => s.id === serviceId) ?? null,
    [services, serviceId],
  );

  const result = useMemo(
    () => (service ? computeQuote(service, values, quantity) : null),
    [service, values, quantity],
  );

  function pick(s: QuoterService) {
    setServiceId(s.id);
    setValues(defaultValuesFor(s));
    setQuantity(1);
    setSent(false);
    setSendError(null);
  }

  function pickFile(list: FileList | null) {
    const f = list?.[0] ?? null;
    if (!f) return;
    const err = validateFile(f);
    if (err) {
      setFileError(err);
      setFile(null);
      return;
    }
    setFileError(null);
    setFile(f);
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!service || !result || fileError) return;
    const data = new FormData(e.currentTarget);

    setSending(true);
    setSendError(null);
    try {
      let file_path: string | null = null;
      let file_name: string | null = null;
      if (file) {
        const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
        const path = `cotizaciones/${crypto.randomUUID()}-${safe}`;
        const up = await supabase.storage.from("quote-files").upload(path, file, { upsert: false });
        if (up.error) throw new Error("No pudimos subir el archivo: " + up.error.message);
        file_path = path;
        file_name = file.name;
      }

      const resumen = result.answers.map((a) => `${a.label}: ${a.value}`).join(" · ");

      await saveQuote({
        data: {
          customer_name: String(data.get("name") ?? ""),
          customer_email: String(data.get("email") ?? ""),
          customer_phone: String(data.get("phone") ?? ""),
          service_id: service.id,
          service_name: service.name,
          answers: result.answers,
          quantity: result.quantity,
          estimated_total_cop: result.total_cop,
          design_state: service.name,
          size_label: resumen.slice(0, 160),
          material: String(values['material'] ?? values['tipo'] ?? ""),
          finish: String(values['acabado'] ?? values['trabajo'] ?? ""),
          notes: notes.slice(0, 1000),
          file_name,
          file_path,
        },
      });

      const lines = [
        `Hola Will Design 3D, quiero cotizar: *${service.name}*`,
        ``,
        `👤 ${data.get("name")}`,
        `✉️ ${data.get("email")}`,
        `📱 ${data.get("phone")}`,
        ``,
        ...result.answers.map((a) => `• ${a.label}: ${a.value}`),
        `• Cantidad: ${result.quantity}`,
        ``,
        `💰 Estimado en la web: ${formatCOP(result.total_cop)}`,
        notes.trim() ? `📝 Notas: ${notes.trim()}` : "",
        file_name ? `📎 Archivo enviado: ${file_name}` : "",
      ].filter(Boolean);

      setSent(true);
      window.open(waLink(contact.whatsapp, lines.join("\n")), "_blank");
    } catch (err) {
      setSendError((err as Error).message || "No pudimos enviar la cotización.");
    } finally {
      setSending(false);
    }
  }

  return (
    <section id="cotizador" className="mx-auto max-w-7xl px-4 py-16 sm:px-6 md:py-24">
      <div className="mx-auto max-w-3xl text-center">
        <span className="chip-teal">Cotizador</span>
        <h2 className="mt-3 text-3xl font-black sm:text-4xl md:text-5xl">
          Cotiza tu <span style={{ color: "var(--brand-orange)" }}>proyecto 3D</span> en un minuto
        </h2>
        <p className="mt-3 text-muted-foreground">
          Elige qué necesitas, mueve los deslizadores y verás el precio estimado al instante.
        </p>
      </div>

      {/* Paso 1: elegir servicio */}
      {!service && (
        <div className="mt-10">
          {isLoading ? (
            <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Cargando servicios…
            </div>
          ) : (services ?? []).length === 0 ? (
            <p className="text-center text-sm text-muted-foreground">
              Aún no hay servicios configurados en el cotizador.
            </p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {(services ?? []).map((s) => {
                const Icon = ICONS[s.icon] ?? Printer;
                return (
                  <button
                    key={s.id}
                    onClick={() => pick(s)}
                    className="group rounded-3xl border border-border bg-card p-5 text-left transition hover:-translate-y-0.5 hover:border-[var(--brand-orange)] hover:shadow-lg"
                  >
                    <Icon className="h-7 w-7 text-[var(--brand-orange)]" />
                    <h3 className="mt-3 text-lg font-black leading-tight">{s.name}</h3>
                    {s.tagline && (
                      <p className="text-xs font-bold uppercase tracking-wide text-[var(--brand-teal-deep)]">
                        {s.tagline}
                      </p>
                    )}
                    <p className="mt-2 text-sm text-muted-foreground">{s.description}</p>
                    <span className="mt-3 inline-flex items-center gap-1 text-sm font-bold text-[var(--brand-wine)]">
                      Cotizar <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Paso 2: configurar */}
      {service && result && (
        <div className="mt-10 grid gap-6 lg:grid-cols-[1.5fr_1fr]">
          <div className="rounded-3xl border border-border bg-card p-6 shadow-sm sm:p-8">
            <button
              onClick={() => setServiceId(null)}
              className="inline-flex items-center gap-1 text-sm font-bold text-muted-foreground hover:text-foreground"
            >
              <ChevronLeft className="h-4 w-4" /> Cambiar servicio
            </button>

            <div className="mt-4 flex items-start gap-3">
              <img
                src={kiaraAsset.url}
                alt="Kiara, la mascota de Will Design 3D"
                width={56}
                height={56}
                className="h-14 w-14 shrink-0 rounded-full object-cover ring-2 ring-[var(--brand-orange)]"
              />
              <div
                className="rounded-2xl border border-border px-4 py-3 text-sm"
                style={{ background: "color-mix(in oklab, var(--brand-orange) 10%, white)" }}
              >
                <strong>{service.name}.</strong> {service.description} Ajusta los valores y yo calculo
                el precio 🐾
              </div>
            </div>

            <form onSubmit={onSubmit} className="mt-6 grid gap-6">
              {service.fields.map((f) => (
                <FieldControl
                  key={f.id}
                  field={f}
                  value={values[f.key] ?? ""}
                  onChange={(v) => setValues((prev) => ({ ...prev, [f.key]: v }))}
                />
              ))}

              {service.allow_quantity && (
                <div>
                  <span className="text-sm font-bold">Cantidad</span>
                  <div className="mt-2 flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                      aria-label="Quitar una unidad"
                      className="rounded-full border border-border p-2 hover:bg-muted"
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                    <input
                      type="range"
                      min={1}
                      max={100}
                      value={Math.min(quantity, 100)}
                      onChange={(e) => setQuantity(Number(e.target.value))}
                      aria-label="Cantidad"
                      className="flex-1 accent-[var(--brand-orange)]"
                    />
                    <button
                      type="button"
                      onClick={() => setQuantity((q) => q + 1)}
                      aria-label="Agregar una unidad"
                      className="rounded-full border border-border p-2 hover:bg-muted"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                    <span className="w-14 text-center text-sm font-black">{quantity}</span>
                  </div>
                </div>
              )}

              {service.allow_file && (
                <div>
                  <span className="text-sm font-bold">Archivo (opcional)</span>
                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      setDragging(true);
                    }}
                    onDragLeave={() => setDragging(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setDragging(false);
                      pickFile(e.dataTransfer.files);
                    }}
                    className={`mt-2 rounded-2xl border-2 border-dashed p-5 text-center transition ${
                      dragging ? "border-[var(--brand-orange)] bg-muted" : "border-border"
                    }`}
                  >
                    <Upload className="mx-auto h-6 w-6 text-muted-foreground" />
                    <p className="mt-2 text-sm">
                      Arrastra tu archivo o{" "}
                      <button
                        type="button"
                        onClick={() => inputRef.current?.click()}
                        className="font-bold text-[var(--brand-wine)] underline"
                      >
                        búscalo en tu equipo
                      </button>
                    </p>
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      .stl .obj .3mf .step .pdf .jpg .png — hasta 50 MB
                    </p>
                    <input
                      ref={inputRef}
                      type="file"
                      className="hidden"
                      accept={ALLOWED_EXT.join(",")}
                      onChange={(e) => pickFile(e.target.files)}
                    />
                    {file && (
                      <p className="mt-3 inline-flex items-center gap-2 rounded-full bg-muted px-3 py-1 text-xs font-semibold">
                        <CheckCircle2 className="h-4 w-4 text-green-600" /> {file.name}
                        <button type="button" onClick={() => setFile(null)} aria-label="Quitar archivo">
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </p>
                    )}
                  </div>
                  {fileError && (
                    <p className="mt-2 inline-flex items-center gap-2 text-xs font-semibold text-red-600">
                      <AlertTriangle className="h-4 w-4" /> {fileError}
                    </p>
                  )}
                </div>
              )}

              <label className="block">
                <span className="text-sm font-bold">Cuéntanos más (opcional)</span>
                <textarea
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  maxLength={1000}
                  placeholder="Colores, fecha límite, referencias…"
                  className={`mt-2 ${inputCls}`}
                />
              </label>

              <div className="grid gap-3 sm:grid-cols-3">
                <label className="block">
                  <span className="text-sm font-bold">Nombre</span>
                  <input name="name" required minLength={2} maxLength={120} className={`mt-2 ${inputCls}`} />
                </label>
                <label className="block">
                  <span className="text-sm font-bold">Correo</span>
                  <input name="email" type="email" required maxLength={160} className={`mt-2 ${inputCls}`} />
                </label>
                <label className="block">
                  <span className="text-sm font-bold">WhatsApp</span>
                  <input name="phone" required maxLength={40} className={`mt-2 ${inputCls}`} />
                </label>
              </div>

              <button
                type="submit"
                disabled={sending}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-[var(--brand-orange)] px-7 py-3.5 text-base font-black text-white shadow-lg disabled:opacity-60"
              >
                {sending ? <Loader2 className="h-5 w-5 animate-spin" /> : null}
                Enviar cotización por {formatCOP(result.total_cop)}
              </button>

              {sendError && (
                <p className="inline-flex items-center gap-2 text-sm font-semibold text-red-600">
                  <AlertTriangle className="h-4 w-4" /> {sendError}
                </p>
              )}
              {sent && (
                <p className="inline-flex items-center gap-2 rounded-2xl bg-green-50 px-4 py-3 text-sm font-semibold text-green-700">
                  <CheckCircle2 className="h-4 w-4" /> ¡Listo! Guardamos tu cotización y abrimos
                  WhatsApp con el resumen.
                </p>
              )}
            </form>
          </div>

          {/* Resumen en vivo */}
          <aside className="h-fit rounded-3xl border-2 border-[var(--brand-orange)] bg-card p-6 lg:sticky lg:top-24">
            <p className="text-xs font-bold uppercase tracking-wide text-[var(--brand-wine)]">
              Tu precio estimado
            </p>
            <p className="mt-1 text-4xl font-black leading-none">{formatCOP(result.total_cop)}</p>
            {result.quantity > 1 && (
              <p className="mt-1 text-xs text-muted-foreground">
                {formatCOP(result.unit_price_cop)} por unidad × {result.quantity}
              </p>
            )}

            <div className="mt-4 space-y-1 border-t border-dashed border-border pt-3 text-xs">
              {result.lines.map((l, i) => (
                <div key={`${l.label}-${i}`} className="flex justify-between gap-3 text-muted-foreground">
                  <span>
                    {l.label}
                    {l.detail ? ` · ${l.detail}` : ""}
                  </span>
                  <span className="whitespace-nowrap">{formatCOP(l.amount)}</span>
                </div>
              ))}
              {result.multiplier !== 1 && (
                <div className="flex justify-between text-muted-foreground">
                  <span>Ajuste por opciones</span>
                  <span>×{result.multiplier.toFixed(2)}</span>
                </div>
              )}
              {result.margin_cop > 0 && (
                <div className="flex justify-between text-muted-foreground">
                  <span>Servicio y garantía</span>
                  <span>{formatCOP(result.margin_cop)}</span>
                </div>
              )}
              {result.min_applied && (
                <p className="pt-1 text-[11px] text-muted-foreground">
                  Se aplicó el valor mínimo de este servicio.
                </p>
              )}
            </div>

            <p className="mt-4 text-[11px] text-muted-foreground">
              Es un estimado automático. Confirmamos el precio final al revisar tu archivo o idea.
            </p>
          </aside>
        </div>
      )}
    </section>
  );
}
