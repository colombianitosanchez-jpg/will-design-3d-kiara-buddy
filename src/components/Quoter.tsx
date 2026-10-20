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
import { ShoppingCart } from "lucide-react";
import { toast } from "sonner";
import kiaraAsset from "@/assets/kiara.asset.json";
import { siteContentQuery, getContactInfo, waLink, buildWhatsAppQuoteMessage } from "@/lib/catalog";
import { useSiteContent } from "@/hooks/use-site-content";
import { useCart } from "@/lib/cart";
import { Link } from "@tanstack/react-router";

import { supabase } from "@/integrations/supabase/client";
import { createQuoteRequest } from "@/lib/quotes.functions";
import { computeQuoteServerFn } from "@/lib/quoter.functions";
import {
  quoterServicesQuery,
  defaultValuesFor,
  formatCOP,
  isOn,
  type QuoterService,
  type QuoterField,
  type QuoterValues,
  coerceAnswersDetailed,
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
        {field.media_url && (
          <div className="mt-2 overflow-hidden rounded-2xl border border-border bg-muted/20">
            {field.media_type === "video" ? (
              <video src={field.media_url} autoPlay loop muted playsInline className="h-40 w-full object-cover" />
            ) : (
              <img src={field.media_url} alt={field.label} className="h-40 w-full object-cover" />
            )}
          </div>
        )}
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          {field.options.map((o) => {
            const active = o.value === value;
            return (
              <button
                type="button"
                key={o.value}
                onClick={() => onChange(o.value)}
                className={`flex flex-col gap-2 rounded-xl border p-3 text-left text-sm transition ${
                  active
                    ? "border-[var(--brand-orange)] bg-[color-mix(in_oklab,var(--brand-orange)_10%,white)] font-bold"
                    : "border-border hover:bg-muted"
                }`}
              >
                {o.media?.url && (
                  <div className="overflow-hidden rounded-lg bg-muted">
                    {o.media.type === "video" ? (
                      <video src={o.media.url} autoPlay loop muted playsInline className="h-24 w-full object-cover" />
                    ) : (
                      <img src={o.media.url} alt={o.label} className="h-24 w-full object-cover" />
                    )}
                  </div>
                )}
                <div>
                  <div>{o.label}</div>
                  {o.add_cop ? (
                    <span className="mt-0.5 block text-[11px] text-muted-foreground font-normal">
                      +{formatCOP(o.add_cop)}
                    </span>
                  ) : null}
                </div>
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

type PublicQuoteResult = {
  service_id: string;
  service_name: string;
  total_cop: number;
  unit_price_cop: number;
  quantity: number;
  requires_approval: boolean;
  answers: { label: string; value: string }[];
  lines: { label: string; detail: string; amount: number }[];
  price_display: string;
};

export function Quoter({ initialServiceSlug }: { initialServiceSlug?: string } = {}) {
  const { data: services, isLoading } = useQuery(quoterServicesQuery());
  const { data: content } = useQuery(siteContentQuery());
  const { getText } = useSiteContent();

  const contact = getContactInfo(content);
  const saveQuote = useServerFn(createQuoteRequest);
  const calculateQuote = useServerFn(computeQuoteServerFn);
  const { items: cartItems, addItem } = useCart();


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
  const [serverResult, setServerResult] = useState<PublicQuoteResult | null>(null);
  const [calculating, setCalculating] = useState(false);
  const [calculationError, setCalculationError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const service = useMemo(
    () => (services ?? []).find((s) => s.id === serviceId) ?? null,
    [services, serviceId],
  );

  // Solo se envían las respuestas a servidor; nunca se descarga al navegador la tabla real de costes.
  useEffect(() => {
    if (!service) {
      setServerResult(null);
      setCalculationError(null);
      setCalculating(false);
      return;
    }

    let cancelled = false;
    setCalculating(true);
    setCalculationError(null);
    const timer = window.setTimeout(() => {
      void calculateQuote({ data: { serviceSlug: service.slug, answers: values, quantity } })
        .then((response) => {
          if (!cancelled) setServerResult(response as PublicQuoteResult);
        })
        .catch((error: unknown) => {
          if (!cancelled) setCalculationError(error instanceof Error ? error.message : "No se pudo calcular el precio.");
        })
        .finally(() => {
          if (!cancelled) setCalculating(false);
        });
    }, 160);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [calculateQuote, service, values, quantity]);

  const result = serverResult && serverResult.service_id === service?.id ? serverResult : null;

  /** Agrega el servicio cotizado al carrito como una línea de servicio. */
  function addQuoteToCart() {
    if (!service || !result || calculating || calculationError) return;
    const { missingRequired } = coerceAnswersDetailed(service, values);
    if (missingRequired.length > 0) {
      toast.error("Completa los campos obligatorios: " + missingRequired.map((field) => field.label).join(", "));
      return;
    }
    const answers: Record<string, string> = { ...values };
    const key = `svc:${service.slug}:${JSON.stringify(answers)}`;
    addItem(
      {
        product_id: key,
        slug: service.slug,
        name: `Servicio: ${service.name}`,
        price_cop: result.unit_price_cop,
        image_url: null,
        kind: "service",
        service_slug: service.slug,
        answers,
        detail: result.answers.map((a) => `${a.label}: ${a.value}`).join(" · ").slice(0, 600),
      },
      result.quantity,
    );
    toast.success("Servicio agregado a tu carrito");
  }

  function pick(s: QuoterService) {
    setServiceId(s.id);
    setServerResult(null);
    setCalculationError(null);
    setValues(defaultValuesFor(s));
    setQuantity(1);
    setSent(false);
    setSendError(null);
  }

  // Preselección desde la URL (/cotizador?servicio=slug) o desde otra página.
  useEffect(() => {
    if (!initialServiceSlug || serviceId) return;
    const match = (services ?? []).find((s) => s.slug === initialServiceSlug);
    if (match) pick(match);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialServiceSlug, services, serviceId]);

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
    if (!service || !result || calculating || calculationError || fileError) return;
    const { missingRequired } = coerceAnswersDetailed(service, values);
    if (missingRequired.length > 0) {
      setSendError("Completa los campos obligatorios: " + missingRequired.map((field) => field.label).join(", "));
      return;
    }
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

      const savedQuote = await saveQuote({
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
      const officialTotal = Number(savedQuote.total_cop);

      const msgText = buildWhatsAppQuoteMessage(
        contact.whatsapp_quote_template,
        {
          servicio: service.name,
          cliente: String(data.get("name") ?? ""),
          email: String(data.get("email") ?? ""),
          telefono: String(data.get("phone") ?? ""),
          resumen: result.answers.map((a) => `• ${a.label}: ${a.value}`).join("\n") + `\n• Cantidad: ${result.quantity}`,
          total: formatCOP(Number.isFinite(officialTotal) ? officialTotal : result.total_cop),
          notas: notes.trim(),
          mediaUrl: file_name ? file_name : null,
        },
      );

      setSent(true);
      window.open(waLink(contact.whatsapp, msgText), "_blank");
    } catch (err) {
      setSendError((err as Error).message || "No pudimos enviar la cotización.");
    } finally {
      setSending(false);
    }
  }

  return (
    <section id="cotizador" className="mx-auto max-w-7xl px-4 py-16 sm:px-6 md:py-24">
      <div className="mx-auto max-w-3xl text-center">
        <span className="chip-teal">{getText("quoter_badge", "Cotizador")}</span>
        <h2 className="mt-3 text-3xl font-black sm:text-4xl md:text-5xl">
          {getText("quoter_title", "Cotiza tu proyecto 3D en un minuto")}
        </h2>
        <p className="mt-3 text-muted-foreground">
          {getText(
            "quoter_subtitle",
            "Elige qué necesitas, mueve los deslizadores y verás el precio estimado al instante.",
          )}
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
            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={() => setServiceId(null)}
                className="inline-flex items-center gap-1 text-sm font-bold text-muted-foreground hover:text-foreground"
              >
                <ChevronLeft className="h-4 w-4" /> Cambiar servicio
              </button>
              <label className="ml-auto flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                Selecciona el servicio
                <select
                  value={service.id}
                  onChange={(e) => {
                    const next = (services ?? []).find((s) => s.id === e.target.value);
                    if (next) pick(next);
                  }}
                  className="rounded-xl border border-border bg-background px-3 py-2 text-sm font-semibold normal-case tracking-normal text-foreground"
                >
                  {(services ?? []).map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>

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
                      onClick={() => setQuantity((q) => Math.min(99, q + 1))}
                      disabled={quantity >= 99}
                      aria-label="Agregar una unidad"
                      className="rounded-full border border-border p-2 hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
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
                disabled={sending || calculating || !result || Boolean(calculationError)}
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
                <div className="space-y-3">
                  <p className="inline-flex items-center gap-2 rounded-2xl bg-green-50 px-4 py-3 text-sm font-semibold text-green-700">
                    <CheckCircle2 className="h-4 w-4" /> ¡Listo! Guardamos tu cotización y abrimos
                    WhatsApp con el resumen.
                  </p>
                  {cartItems.length > 0 && (
                    <div className="rounded-2xl border border-[var(--brand-orange)] bg-[color-mix(in_oklab,var(--brand-orange)_10%,white)] p-4 text-sm">
                      <p className="font-bold">
                        Tienes {cartItems.length} producto(s) en tu carrito de compras.
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Mientras nuestro equipo revisa y aprueba tu cotización, puedes avanzar pagando y procesando los productos de tu carrito.
                      </p>
                      <Link
                        to="/carrito"
                        className="btn-primary mt-3 inline-flex text-xs font-bold"
                      >
                        Ir a pagar los productos del carrito
                      </Link>
                    </div>
                  )}
                </div>
              )}
            </form>
          </div>

          {/* Resumen en vivo */}
          <aside className="h-fit rounded-3xl border-2 border-[var(--brand-orange)] bg-card p-6 lg:sticky lg:top-24">
            <p className="text-xs font-bold uppercase tracking-wide text-[var(--brand-wine)]">
              Tu precio estimado
            </p>
            <p className="mt-1 text-4xl font-black leading-none">
              {calculating ? "Calculando…" : result ? formatCOP(result.total_cop) : "—"}
            </p>
            {calculationError && (
              <p role="alert" className="mt-2 text-xs font-semibold text-red-600">{calculationError}</p>
            )}
            {result.quantity > 1 && (
              <p className="mt-1 text-xs text-muted-foreground">
                {formatCOP(result.unit_price_cop)} por unidad × {result.quantity}
              </p>
            )}

            <div className="mt-4 space-y-1 border-t border-dashed border-border pt-3 text-xs">
              {(!result && !calculationError && !calculating) && (
                <p className="text-xs text-muted-foreground">Configura el servicio para calcular tu precio.</p>
              )}
              {(result?.lines ?? []).map((l, i) => (
                <div key={`${l.label}-${i}`} className="flex justify-between gap-3 text-muted-foreground">
                  <span>
                    {l.label}
                    {l.detail ? ` · ${l.detail}` : ""}
                  </span>
                  <span className="whitespace-nowrap">{formatCOP(l.amount)}</span>
                </div>
              ))}

            </div>

            {result.requires_approval && (
              <div className="mt-3 rounded-2xl bg-amber-50 border border-amber-200 p-3 text-xs text-amber-800">
                <span className="font-bold block">⚠️ Requiere revisión previa:</span>
                Esta cotización supera el umbral automático. Tras enviarla por WhatsApp, nuestro equipo la aprobará formalmente.
              </div>
            )}

            <button
              type="button"
              onClick={addQuoteToCart}
              disabled={!result || calculating || Boolean(calculationError)}
              className="mt-4 inline-flex w-full disabled:cursor-not-allowed disabled:opacity-50 items-center justify-center gap-2 rounded-full border-2 border-[var(--brand-teal-deep)] px-5 py-2.5 text-sm font-black text-[var(--brand-teal-deep)] transition hover:bg-muted"
            >
              <ShoppingCart className="h-4 w-4" /> Agregar al carrito
            </button>

            {cartItems.length > 0 && (
              <div className="mt-3 rounded-2xl border border-border bg-muted/30 p-3 text-center">
                <p className="text-xs font-bold">¿Tienes productos en tu carrito?</p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  Puedes pagar tus productos del carrito ({cartItems.length}) inmediatamente sin esperar la revisión de la cotización.
                </p>
                <Link
                  to="/carrito"
                  className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-primary underline"
                >
                  Ir al checkout del carrito →
                </Link>
              </div>
            )}

            <p className="mt-4 text-[11px] text-muted-foreground">
              Es un estimado automático. Confirmamos el precio final al revisar tu archivo o idea.
            </p>
          </aside>
        </div>
      )}
    </section>
  );
}
