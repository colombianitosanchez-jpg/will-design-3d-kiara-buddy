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
  ShoppingCart,
  Image as ImageIcon,
  Check,
  MessageSquare,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import kiaraAsset from "@/assets/kiara.asset.json";
import { siteContentQuery, getContactInfo, waLink, buildWhatsAppQuoteMessage } from "@/lib/catalog";
import { openExternalUrl } from "@/lib/whatsapp";
import { useSiteContent } from "@/hooks/use-site-content";
import { useCart } from "@/lib/cart";
import { computePublicQuote } from "@/lib/quoter.functions";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { createQuoteRequest, createQuoteUploadUrl } from "@/lib/quotes.functions";
import {
  quoterServicesQuery,
  defaultValuesFor,
  quoteAnswerErrors,
  formatCOP,
  isOn,
  type QuoterService,
  type QuoterField,
  type QuoterValues,
} from "@/lib/quoter";
import {
  clampSliderValue,
  formatOptionPriceBadge,
  sliderPercentage,
} from "@/lib/quoter-ui";

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

/* -------------------------- Deslizador paramétrico -------------------------- */

function ParametricSlider({
  label,
  min,
  max,
  step,
  value,
  unit,
  help,
  onChange,
}: {
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
  unit?: string;
  help?: string;
  onChange: (val: number) => void;
}) {
  const [dragging, setDragging] = useState(false);
  const clamped = clampSliderValue(value, min, max, step);
  const pct = sliderPercentage(clamped, min, max);
  const unitSuffix = unit ? ` ${unit}` : "";

  return (
    <div className="rounded-2xl border border-border bg-background/60 p-4 space-y-2.5">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-bold text-foreground">{label}</span>
        <span className="inline-flex items-center rounded-lg bg-secondary px-2.5 py-1 text-xs font-black text-primary-foreground tabular-nums">
          {clamped}
          {unitSuffix}
        </span>
      </div>

      <div className="relative pt-5 pb-1">
        {/* Indicador flotante sobre el pulgar al arrastrar o enfocar */}
        <div
          aria-hidden="true"
          style={{ left: `clamp(1.75rem, ${pct}%, calc(100% - 1.75rem))` }}
          className={`pointer-events-none absolute -top-1 -translate-x-1/2 rounded-md bg-accent px-2 py-0.5 text-[11px] font-black text-primary-foreground shadow-sm tabular-nums transition-opacity duration-150 motion-reduce:transition-none ${
            dragging ? "opacity-100" : "opacity-0"
          }`}
        >
          {clamped}
          {unitSuffix}
        </div>

        <input
          type="range"
          min={min}
          max={max}
          step={step || 1}
          value={clamped}
          aria-label={label}
          onPointerDown={() => setDragging(true)}
          onPointerUp={() => setDragging(false)}
          onPointerCancel={() => setDragging(false)}
          onFocus={() => setDragging(true)}
          onBlur={() => setDragging(false)}
          onChange={(e) => onChange(Number(e.target.value))}
          style={{
            background: `linear-gradient(to right, var(--brand-orange) 0%, var(--brand-orange) ${pct}%, var(--border) ${pct}%, var(--border) 100%)`,
          }}
          className="min-h-11 w-full cursor-pointer appearance-none rounded-full accent-[var(--brand-orange)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-orange)] focus-visible:ring-offset-2"
        />
      </div>

      <div className="flex items-center justify-between text-[11px] font-medium text-muted-foreground tabular-nums">
        <span>
          Mín: {min}
          {unitSuffix}
        </span>
        <span>
          Máx: {max}
          {unitSuffix}
        </span>
      </div>

      <label className="flex items-center gap-3 text-xs text-muted-foreground">
        Valor exacto
        <input type="number" min={min} max={max} step={step} value={clamped} aria-label={`${label}: valor exacto`} onChange={(e) => onChange(clampSliderValue(e.target.value, min, max, step))} className="min-h-11 w-28 rounded-lg border border-input bg-background px-3 text-sm text-foreground" />
      </label>
      {help && <p className="text-xs text-muted-foreground leading-relaxed">{help}</p>}
    </div>
  );
}

/* ------------------------ Tarjeta de opción con media ----------------------- */

function SelectOptionMedia({
  url,
  type,
  alt,
}: {
  url: string;
  type?: "image" | "video" | "gif";
  alt: string;
}) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div className="flex h-28 w-full items-center justify-center rounded-xl bg-muted/60 text-muted-foreground">
        <ImageIcon className="h-6 w-6 opacity-50" />
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl bg-muted border border-border/60">
      {type === "video" ? (
        <video
          src={url}
          autoPlay
          loop
          muted
          playsInline
          onError={() => setFailed(true)}
          className="h-28 w-full object-cover"
        />
      ) : (
        <img
          src={url}
          alt={alt}
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          onError={() => setFailed(true)}
          className="h-28 w-full object-cover aspect-video"
        />
      )}
    </div>
  );
}

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
    const v = Number(value);
    return (
      <ParametricSlider
        label={field.label}
        min={field.min_value}
        max={field.max_value}
        step={field.step_value || 1}
        value={Number.isFinite(v) ? v : field.min_value}
        unit={field.unit}
        help={field.help}
        onChange={(next) => onChange(String(next))}
      />
    );
  }

  if (field.input_type === "select") {
    return (
      <div className="space-y-2.5">
        <span className="text-sm font-bold text-foreground block">{field.label}</span>

        {field.media_url && (
          <div className="overflow-hidden rounded-2xl border border-border bg-muted/20">
            {field.media_type === "video" ? (
              <video src={field.media_url} autoPlay loop muted playsInline className="h-40 w-full object-cover" />
            ) : (
              <img
                src={field.media_url}
                alt={field.label}
                loading="lazy"
                decoding="async"
                referrerPolicy="no-referrer"
                className="h-40 w-full object-cover aspect-video"
              />
            )}
          </div>
        )}

        <RadioGroup value={value} onValueChange={onChange} className="grid gap-2.5 sm:grid-cols-2" aria-label={field.label}>
          {field.options.map((o, idx) => {
            const active = o.value === value;
            const priceBadge = formatOptionPriceBadge(o);
            const activeAccent =
              idx % 3 === 1
                ? "border-[var(--brand-teal)] bg-[color-mix(in_oklab,var(--brand-teal)_10%,white)]"
                : idx % 3 === 2
                  ? "border-[var(--brand-wine)] bg-[color-mix(in_oklab,var(--brand-wine)_8%,white)]"
                  : "border-[var(--brand-orange)] bg-[color-mix(in_oklab,var(--brand-orange)_10%,white)]";

            const checkBg =
              idx % 3 === 1
                ? "bg-secondary"
                : idx % 3 === 2
                  ? "bg-accent"
                  : "bg-primary";

            return (
              <label
                key={o.value}
                className={`group has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring relative flex flex-col gap-2.5 rounded-2xl border-2 p-3.5 text-left text-sm transition ${
                  active
                    ? `${activeAccent} shadow-xs`
                    : "border-border bg-background hover:border-muted-foreground/40 hover:bg-muted/40"
                }`}
              >
                <RadioGroupItem value={o.value} aria-label={o.label} className="sr-only peer" />
                {o.media?.url && (
                  <SelectOptionMedia url={o.media.url} type={o.media.type} alt={o.label} />
                )}

                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-0.5">
                    <div className={active ? "font-bold text-foreground" : "font-semibold text-foreground"}>
                      {o.label}
                    </div>
                    {o.description && (
                      <p className="text-xs text-muted-foreground leading-snug">{o.description}</p>
                    )}
                    {priceBadge && (
                      <span className="mt-1 inline-block text-xs font-bold text-secondary tabular-nums">
                        {priceBadge}
                      </span>
                    )}
                  </div>

                  <span
                    aria-hidden="true"
                    className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition ${
                      active
                        ? `${checkBg} border-transparent text-primary-foreground`
                        : "border-border bg-background"
                    }`}
                  >
                    {active && <Check className="h-3 w-3 stroke-[3]" />}
                  </span>
                </div>
              </label>
            );
          })}
        </RadioGroup>

        {field.help && <p className="text-xs text-muted-foreground">{field.help}</p>}
      </div>
    );
  }

  if (field.input_type === "toggle") {
    const on = isOn(value);
    const toggleBadge = field.options[0] ? formatOptionPriceBadge(field.options[0]) : null;
    return (
      <label
        className={`flex cursor-pointer items-start justify-between gap-3 rounded-2xl border-2 p-4 transition ${
          on
            ? "border-[var(--brand-orange)] bg-[color-mix(in_oklab,var(--brand-orange)_8%,white)]"
            : "border-border bg-background hover:bg-muted/40"
        }`}
      >
        <div className="flex items-start gap-3">
          <input
            type="checkbox"
            checked={on}
            onChange={(e) => onChange(e.target.checked ? "si" : "no")}
            className="mt-0.5 h-4 w-4 accent-[var(--brand-orange)]"
          />
          <span className="text-sm">
            <span className="font-bold text-foreground">{field.label}</span>
            {toggleBadge && (
              <span className="ml-2 text-xs font-bold text-secondary tabular-nums">
                ({toggleBadge})
              </span>
            )}
            {field.help && <span className="mt-0.5 block text-xs text-muted-foreground">{field.help}</span>}
          </span>
        </div>
      </label>
    );
  }

  if (field.input_type === "number") {
    return (
      <label className="block">
        <span className="text-sm font-bold text-foreground">
          {field.label}
          {field.unit ? ` (${field.unit})` : ""}
        </span>
        <input
          type="number"
          min={field.min_value}
          max={field.max_value}
          step={field.step_value || 1}
          value={value}
          required={field.is_required}
          onChange={(e) => onChange(e.target.value)}
          className={`mt-2 tabular-nums ${inputCls}`}
        />
        {field.help && <p className="mt-1 text-xs text-muted-foreground">{field.help}</p>}
      </label>
    );
  }

  return (
    <label className="block">
      <span className="text-sm font-bold text-foreground">{field.label}</span>
      <input value={value} onChange={(e) => onChange(e.target.value)} className={`mt-2 ${inputCls}`} />
      {field.help && <p className="mt-1 text-xs text-muted-foreground">{field.help}</p>}
    </label>
  );
}

/* --------------------------------- Cotizador -------------------------------- */

export function Quoter({ initialServiceSlug }: { initialServiceSlug?: string } = {}) {
  const { data: services, isLoading, error: servicesError } = useQuery(quoterServicesQuery());
  const { data: content } = useQuery(siteContentQuery());
  const { getText } = useSiteContent();

  const contact = getContactInfo(content);
  const saveQuote = useServerFn(createQuoteRequest);
  const getUploadUrl = useServerFn(createQuoteUploadUrl);
  const computeQuoteFn = useServerFn(computePublicQuote);
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
  const [pricePulse, setPricePulse] = useState(false);
  const [kiaraImgFailed, setKiaraImgFailed] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const service = useMemo(
    () => (services ?? []).find((s) => s.id === serviceId) ?? null,
    [services, serviceId],
  );

  const [debouncedValues, setDebouncedValues] = useState(values);
  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedValues(values), 200);
    return () => window.clearTimeout(timer);
  }, [values]);
  const { data: serverResult, isFetching: pricingBusy, error: pricingError } = useQuery({
    queryKey: ["quoter", "public-quote", service?.id ?? null, debouncedValues, quantity],
    queryFn: () => {
      if (!service || service.has_calculator === false) return null;
      return computeQuoteFn({ data: { service_id: service.id, values: debouncedValues, quantity } });
    },
    enabled: Boolean(service && service.has_calculator !== false),
    retry: 1,
  });
  const [displayResult, setDisplayResult] = useState<typeof serverResult>(null);
  useEffect(() => { setDisplayResult(null); }, [serviceId]);
  useEffect(() => { if (serverResult) setDisplayResult(serverResult); }, [serverResult]);
  const result = service ? displayResult : null;
  const answerErrors = service ? quoteAnswerErrors(service, values) : [];
  const pricePending = pricingBusy || debouncedValues !== values || !serverResult;
  const priceReady = Boolean(result && !pricePending && !pricingError && !answerErrors.length && result.total_cop > 0);

  // Animación sutil en el total cuando el precio cambia
  useEffect(() => {
    if (!result) return;
    setPricePulse(true);
    const id = window.setTimeout(() => setPricePulse(false), 260);
    return () => window.clearTimeout(id);
  }, [result?.total_cop]);

  /** Agrega el servicio cotizado al carrito como una línea de servicio. */
  function addQuoteToCart() {
    if (!service || !result || !priceReady || result.requires_approval) return;
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
    setValues(defaultValuesFor(s));
    setQuantity(1);
    setFile(null);
    setFileError(null);
    setNotes("");
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
    if (!service || !result || !priceReady || fileError) return;
    const data = new FormData(e.currentTarget);

    setSending(true);
    setSendError(null);
    try {
      let file_path: string | null = null;
      let file_name: string | null = null;
      if (file && service.allow_file) {
        const { path, token } = await getUploadUrl({ data: { file_name: file.name } });
        const up = await supabase.storage.from("quote-files").uploadToSignedUrl(path, token, file);
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
          values,
          quantity: result.quantity,
          estimated_total_cop: result.total_cop,
          design_state: service.name,
          size_label: resumen.slice(0, 160),
          material: String(values["material"] ?? values["tipo"] ?? ""),
          finish: String(values["acabado"] ?? values["trabajo"] ?? ""),
          notes: notes.slice(0, 1000),
          file_name,
          file_path,
        },
      });

      const msgText = buildWhatsAppQuoteMessage(
        service.whatsapp_custom_message || contact.whatsapp_quote_template,
        {
          servicio: service.name,
          cliente: String(data.get("name") ?? ""),
          email: String(data.get("email") ?? ""),
          telefono: String(data.get("phone") ?? ""),
          resumen:
            result.answers.map((a) => `• ${a.label}: ${a.value}`).join("\n") +
            `\n• Cantidad: ${result.quantity}`,
          total: formatCOP(result.total_cop),
          notas: notes.trim(),
          mediaUrl: file_name ? file_name : null,
        },
      );

      setSent(true);
      const url = waLink(contact.whatsapp, msgText);
      if (!url) {
        toast.error("Configura WhatsApp en /panel/marca");
        return;
      }
      openExternalUrl(url);
    } catch (err) {
      setSendError((err as Error).message || "No pudimos enviar la cotización.");
    } finally {
      setSending(false);
    }
  }

  const badgeText = getText("quoter_badge") || "Cotizador";
  const titleText = getText("quoter_title") || "Cotiza tu proyecto 3D en un minuto";
  const subtitleText =
    getText("quoter_subtitle") ||
    "Elige qué necesitas, mueve los deslizadores y verás el precio estimado al instante.";
  const disclaimerText =
    getText("quoter_disclaimer") ||
    "Es un estimado automático. Confirmamos el precio final al revisar tu archivo o idea.";

  const activeServices = services ?? [];
  const serviceGridCols =
    activeServices.length === 1
      ? "mx-auto max-w-md grid-cols-1"
      : activeServices.length === 2
        ? "mx-auto max-w-2xl sm:grid-cols-2"
        : activeServices.length === 3
          ? "sm:grid-cols-2 lg:grid-cols-3"
          : "sm:grid-cols-2 lg:grid-cols-4";

  return (
    <section id="cotizador" className="quoter-workspace mx-auto max-w-7xl px-4 py-10 sm:px-6 md:py-14">
      <div className="mx-auto max-w-3xl text-center">
        <span className="chip-teal">{badgeText}</span>
        <h2 className="mt-3 text-3xl font-black sm:text-4xl md:text-5xl">
          {titleText}
        </h2>
        <p className="mt-3 text-muted-foreground">
          {subtitleText}
        </p>
      </div>

      {/* Paso 1: elegir servicio */}
      {!service && (
        <div className="mt-10">
          {isLoading ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[0, 1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-44 animate-pulse rounded-3xl border border-border bg-card/50"
                />
              ))}
            </div>
          ) : servicesError ? (
            <p role="alert" className="py-8 text-center text-destructive">No pudimos cargar los servicios. Inténtalo de nuevo en unos momentos.</p>
          ) : activeServices.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-border bg-card p-10 text-center">
              <Printer className="mx-auto h-9 w-9 text-muted-foreground" />
              <p className="mt-3 text-sm font-semibold text-foreground">
                Aún no hay servicios configurados en el cotizador.
              </p>
              <Link to="/servicios" className="btn-outline mt-4 inline-flex text-xs">
                Ver catálogo de servicios
              </Link>
            </div>
          ) : (
            <div className={`grid gap-4 ${serviceGridCols}`}>
              {activeServices.map((s) => {
                const Icon = ICONS[s.icon] ?? Printer;
                const isDirectWa = s.has_calculator === false;
                return (
                  <Button variant="ghost"
                    key={s.id}
                    type="button"
                    onClick={() => pick(s)}
                    className="group flex flex-col justify-between rounded-3xl border border-border bg-card p-6 text-left shadow-xs transition hover:-translate-y-0.5 hover:border-[var(--brand-orange)] hover:shadow-md"
                  >
                    <div>
                      <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-[color-mix(in_oklab,var(--brand-orange)_14%,white)] text-primary">
                        <Icon className="h-6 w-6" />
                      </div>
                      <h3 className="mt-4 text-lg font-black leading-tight text-foreground">
                        {s.name}
                      </h3>
                      {s.tagline && (
                        <p className="mt-1 text-[11px] font-bold uppercase tracking-wide text-secondary">
                          {s.tagline}
                        </p>
                      )}
                      {s.description && (
                        <p className="mt-2 text-sm text-muted-foreground line-clamp-3">
                          {s.description}
                        </p>
                      )}
                    </div>

                    <div className="mt-5 flex items-center justify-between pt-3 border-t border-border/60">
                      <span className="inline-flex items-center gap-1 text-sm font-bold text-accent">
                        {isDirectWa ? "Consultar" : "Cotizar"}{" "}
                        <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
                      </span>
                      {!isDirectWa && s.min_price_cop > 0 && (
                        <span className="text-[11px] font-semibold text-muted-foreground tabular-nums">
                          Desde {formatCOP(s.min_price_cop)}
                        </span>
                      )}
                    </div>
                  </Button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Paso 2: servicio sin calculadora (WhatsApp directo) */}
      {service && service.has_calculator === false && (
        <div className="mx-auto mt-10 max-w-2xl rounded-3xl border border-border bg-card p-6 sm:p-8 shadow-sm space-y-5">
          <Button variant="ghost"
            type="button"
            onClick={() => setServiceId(null)}
            className="inline-flex items-center gap-1 text-sm font-bold text-muted-foreground hover:text-foreground"
          >
            <ChevronLeft className="h-4 w-4" /> Cambiar servicio
          </Button>

          <div className="space-y-2">
            <h3 className="text-2xl font-black">{service.name}</h3>
            {service.description && (
              <p className="text-sm text-muted-foreground">{service.description}</p>
            )}
          </div>

          <div className="flex items-start gap-3">
            {kiaraImgFailed ? (
              <div
                aria-hidden="true"
                className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[color-mix(in_oklab,var(--brand-orange)_18%,white)] text-xl ring-2 ring-[var(--brand-orange)]"
              >
                🐾
              </div>
            ) : (
              <img
                src={kiaraAsset.url}
                alt="Kiara, la mascota de Will Design 3D"
                width={56}
                height={56}
                onError={() => setKiaraImgFailed(true)}
                className="h-14 w-14 shrink-0 rounded-full object-cover ring-2 ring-[var(--brand-orange)]"
              />
            )}
            <div
              className="rounded-2xl border border-border px-4 py-3 text-sm"
              style={{ background: "color-mix(in oklab, var(--brand-orange) 10%, white)" }}
            >
              Este servicio se cotiza de forma personalizada por WhatsApp para darte el mejor precio según tu caso 🐾
            </div>
          </div>

          {(() => {
            const msg =
              service.whatsapp_custom_message?.trim() ||
              `Hola Will Design 3D! Me interesa solicitar información y cotización sobre el servicio: *${service.name}*`;
            const href = waLink(contact.whatsapp, msg);
            return (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => {
                  if (typeof window !== "undefined" && window.self !== window.top) {
                    e.preventDefault();
                    openExternalUrl(href);
                  }
                }}
                className="btn-primary w-full justify-center text-base"
              >
                <MessageSquare className="h-5 w-5" />
                Cotizar por WhatsApp
              </a>
            );
          })()}
        </div>
      )}

      {service && service.has_calculator !== false && !result && !pricingError && <p role="status" className="mt-8 flex items-center justify-center gap-2"><Loader2 className="size-5 animate-spin" /> Calculando cotización…</p>}
      {pricingError && <div role="alert" className="mt-8 text-center text-destructive"><p>No pudimos calcular el precio. Inténtalo nuevamente.</p><Button variant="outline" onClick={() => setServiceId(null)}>Cambiar servicio</Button></div>}
      {/* Paso 2: configurar calculadora */}
      {service && service.has_calculator !== false && result && (
        <div className="mt-10 grid gap-6 lg:grid-cols-[1.5fr_1fr]">
          <div className="rounded-3xl border border-border bg-card p-6 shadow-sm sm:p-8">
            <div className="flex flex-wrap items-center gap-3">
              <Button variant="ghost"
                type="button"
                onClick={() => setServiceId(null)}
                className="inline-flex items-center gap-1 text-sm font-bold text-muted-foreground hover:text-foreground"
              >
                <ChevronLeft className="h-4 w-4" /> Cambiar servicio
              </Button>
              <label className="ml-auto flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                <span>Servicio</span>
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
              {kiaraImgFailed ? (
                <div
                  aria-hidden="true"
                  className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[color-mix(in_oklab,var(--brand-orange)_18%,white)] text-xl ring-2 ring-[var(--brand-orange)]"
                >
                  🐾
                </div>
              ) : (
                <img
                  src={kiaraAsset.url}
                  alt="Kiara, la mascota de Will Design 3D"
                  width={56}
                  height={56}
                  onError={() => setKiaraImgFailed(true)}
                  className="h-14 w-14 shrink-0 rounded-full object-cover ring-2 ring-[var(--brand-orange)]"
                />
              )}
              <div
                className="rounded-2xl border border-border px-4 py-3 text-sm"
                style={{ background: "color-mix(in oklab, var(--brand-orange) 10%, white)" }}
              >
                <strong>{service.name}.</strong> {service.description} Ajusta los valores y yo calculo
                el precio 🐾
              </div>
            </div>

            <form onSubmit={onSubmit} className="mt-6 grid gap-5">
              {service.fields.filter((f) => f.is_active).map((f) => (
                <FieldControl
                  key={f.id}
                  field={f}
                  value={values[f.key] ?? ""}
                  onChange={(v) => setValues((prev) => ({ ...prev, [f.key]: v }))}
                />
              ))}

              {service.allow_quantity && (
                <div className="rounded-2xl border border-border bg-background/60 p-4 space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-bold text-foreground">Cantidad de unidades</span>
                    <div className="flex items-center gap-2">
                      <Button variant="ghost"
                        type="button"
                        onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                        aria-label="Quitar una unidad"
                        className="rounded-full border border-border bg-background p-1.5 hover:bg-muted"
                      >
                        <Minus className="h-3.5 w-3.5" />
                      </Button>
                      <span className="min-w-10 text-center text-sm font-black tabular-nums">
                        {quantity}
                      </span>
                      <Button variant="ghost"
                        type="button"
                        onClick={() => setQuantity((q) => Math.min(99, q + 1))}
                        aria-label="Agregar una unidad"
                        className="rounded-full border border-border bg-background p-1.5 hover:bg-muted"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                  <input
                    type="range"
                    min={1}
                    max={99}
                    value={quantity}
                    onChange={(e) => setQuantity(Number(e.target.value))}
                    aria-label="Cantidad"
                    style={{
                      background: `linear-gradient(to right, var(--brand-orange) 0%, var(--brand-orange) ${sliderPercentage(Math.min(quantity, 100), 1, 100)}%, var(--border) ${sliderPercentage(Math.min(quantity, 100), 1, 100)}%, var(--border) 100%)`,
                    }}
                    className="min-h-11 w-full cursor-pointer appearance-none rounded-full accent-[var(--brand-orange)]"
                  />
                  <div className="flex justify-between text-[11px] font-medium text-muted-foreground tabular-nums">
                    <span>1 unidad</span>
                    <span>99 unidades</span>
                  </div>
                </div>
              )}

              {service.allow_file && (
                <div>
                  <span className="text-sm font-bold text-foreground">Archivo 3D o referencia (opcional)</span>
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
                      <Button variant="ghost"
                        type="button"
                        onClick={() => inputRef.current?.click()}
                        className="font-bold text-accent underline"
                      >
                        búscalo en tu equipo
                      </Button>
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
                        <Button variant="ghost" type="button" onClick={() => setFile(null)} aria-label="Quitar archivo">
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </p>
                    )}
                  </div>
                  {fileError && (
                    <p className="mt-2 inline-flex items-center gap-2 text-xs font-semibold text-destructive">
                      <AlertTriangle className="h-4 w-4" /> {fileError}
                    </p>
                  )}
                </div>
              )}

              <label className="block">
                <span className="text-sm font-bold text-foreground">Cuéntanos más (opcional)</span>
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
                  <span className="text-sm font-bold text-foreground">Nombre</span>
                  <input name="name" required minLength={2} maxLength={120} className={`mt-2 ${inputCls}`} />
                </label>
                <label className="block">
                  <span className="text-sm font-bold text-foreground">Correo</span>
                  <input name="email" type="email" required maxLength={160} className={`mt-2 ${inputCls}`} />
                </label>
                <label className="block">
                  <span className="text-sm font-bold text-foreground">WhatsApp</span>
                  <input name="phone" required maxLength={40} className={`mt-2 ${inputCls}`} />
                </label>
              </div>

              <Button variant="ghost"
                type="submit"
                disabled={sending || !priceReady}
                className="btn-primary w-full justify-center py-3.5 text-base font-black disabled:opacity-60 tabular-nums"
              >
                {sending ? <Loader2 className="h-5 w-5 animate-spin" /> : <MessageSquare className="h-5 w-5" />}
                Cotizar por WhatsApp ({formatCOP(result.total_cop)})
              </Button>

              {answerErrors.map((error) => <p key={error} role="alert" className="text-sm text-destructive">{error}</p>)}
              {sendError && (
                <p className="inline-flex items-center gap-2 text-sm font-semibold text-destructive">
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
          <aside aria-label="Resumen de cotización" aria-busy={pricePending} className="min-w-0 h-fit rounded-3xl border-2 border-[var(--brand-orange)] bg-card p-6 shadow-sm lg:sticky lg:top-24">
            <p className="text-xs font-bold uppercase tracking-wide text-accent">
              Tu precio estimado
            </p>
            <p
              role="status" aria-live="polite"
              className={`mt-1 break-words text-3xl sm:text-4xl font-black leading-none tabular-nums transition-transform duration-200 motion-reduce:transition-none ${
                pricePulse ? "scale-[1.03] text-primary" : "scale-100 text-foreground"
              }`}
            >
              {formatCOP(result.total_cop)}
            </p>
            {pricePending && <p className="mt-2 text-xs text-muted-foreground" role="status">Actualizando precio…</p>}
            {result.total_cop <= 0 && <p role="alert" className="mt-2 text-sm text-destructive">Este servicio necesita una tarifa configurada antes de comprar.</p>}
            {result.quantity > 1 && (
              <p className="mt-1.5 text-xs text-muted-foreground tabular-nums">
                {formatCOP(result.unit_price_cop)} por unidad × {result.quantity}
              </p>
            )}

            <div className="mt-4 space-y-1.5 border-t border-dashed border-border pt-3 text-xs">
              {result.lines.map((l, i) => (
                <div key={`${l.label}-${i}`} className="flex justify-between gap-3 text-muted-foreground">
                  <span>
                    {l.label}
                    {l.detail ? ` · ${l.detail}` : ""}
                  </span>
                  <span className="whitespace-nowrap tabular-nums">{formatCOP(l.amount)}</span>
                </div>
              ))}
              {result.multiplier !== 1 && (
                <div className="flex justify-between text-muted-foreground">
                  <span>Ajuste por opciones</span>
                  <span className="tabular-nums">×{result.multiplier.toFixed(2)}</span>
                </div>
              )}
              {result.margin_cop > 0 && (
                <div className="flex justify-between text-muted-foreground">
                  <span>Servicio y garantía</span>
                  <span className="tabular-nums">{formatCOP(result.margin_cop)}</span>
                </div>
              )}
              {result.min_applied && (
                <p className="pt-1 text-[11px] font-medium text-secondary">
                  Se aplicó el valor mínimo de este servicio.
                </p>
              )}
            </div>

            {result.requires_approval && (
              <div className="mt-3 rounded-2xl bg-amber-50 border border-amber-200 p-3 text-xs text-amber-800">
                <span className="font-bold block">⚠️ Requiere revisión previa:</span>
                Nuestro equipo debe revisar esta cotización antes de confirmar el precio y recibir el pago.
              </div>
            )}

            <Button variant="ghost"
              type="button"
              disabled={!priceReady || result.requires_approval}
              onClick={addQuoteToCart}
              className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full border-2 border-secondary px-5 py-2.5 text-sm font-black text-foreground transition hover:bg-secondary/10"
            >
              <ShoppingCart className="h-4 w-4" /> {result.requires_approval ? "Pendiente de revisión" : "Agregar al carrito"}
            </Button>

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

            <p className="mt-4 text-[11px] text-muted-foreground leading-relaxed">
              {disclaimerText}
            </p>
          </aside>
        </div>
      )}
    </section>
  );
}
