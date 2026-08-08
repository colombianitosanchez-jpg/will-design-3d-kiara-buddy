import { useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowRight, Upload, CheckCircle2, X, AlertTriangle, Loader2 } from "lucide-react";
import kiaraAsset from "@/assets/kiara.asset.json";
import { siteContentQuery, getContactInfo, waLink } from "@/lib/catalog";
import { supabase } from "@/integrations/supabase/client";
import { createQuoteRequest } from "@/lib/quotes.functions";

type Finish = "estandar" | "preparado" | "premium";

const finishes: { id: Finish; title: string; desc: string }[] = [
  {
    id: "estandar",
    title: "Estándar",
    desc: "Limpieza y retiro de soportes básico.",
  },
  {
    id: "preparado",
    title: "Preparado",
    desc: "Lijado y aplicación de primer (listo para pintar).",
  },
  {
    id: "premium",
    title: "Premium",
    desc: "Pintado completo y acabado profesional personalizado.",
  },
];

const LARGE_FORMAT = "Gran Formato (50x50 cm o más — ¡Nuestra especialidad!)";

const MAX_BYTES = 50 * 1024 * 1024; // 50 MB
const ALLOWED_EXT = [".stl", ".obj", ".jpg", ".jpeg", ".png"];

function validateFile(file: File): string | null {
  const name = file.name.toLowerCase();
  if (!ALLOWED_EXT.some((ext) => name.endsWith(ext))) {
    return `Formato no permitido (“${file.name}”). Solo aceptamos .stl, .obj, .jpg y .png.`;
  }
  if (file.size > MAX_BYTES) {
    return `El archivo pesa ${(file.size / 1024 / 1024).toFixed(1)} MB y el límite es 50 MB.`;
  }
  return null;
}

// Estimación aproximada de material/tiempo según el tamaño elegido, para el
// precio orientativo en vivo (las reglas reales viven en Panel → Reglas de precios).
const SIZE_ESTIMATES: Record<string, { grams: number; hours: number }> = {
  "Pequeño (hasta 10x10 cm)": { grams: 60, hours: 3 },
  "Mediano (hasta 30x30 cm)": { grams: 260, hours: 10 },
  [LARGE_FORMAT]: { grams: 900, hours: 30 },
};

function materialKey(label: string) {
  const l = label.toLowerCase();
  if (l.includes("resina")) return "Resina";
  if (l.includes("tpu") || l.includes("flexible")) return "TPU";
  if (l.includes("petg")) return "PETG";
  return "PLA";
}

const FINISH_KEY: Record<Finish, string> = {
  estandar: "Ninguno",
  preparado: "Basico",
  premium: "Premium",
};

/** Precio orientativo en vivo, calculado con las reglas del Panel. */
function LiveEstimate({
  size,
  material,
  finish,
}: {
  size: string;
  material: string;
  finish: Finish;
}) {
  const est = SIZE_ESTIMATES[size];
  const { data, isFetching } = useQuery({
    queryKey: ["live-estimate", size, materialKey(material), FINISH_KEY[finish]],
    enabled: Boolean(est && material),
    queryFn: async () => {
      const res = await fetch("/api/calculate-quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          grams: est!.grams,
          hours: est!.hours,
          material: materialKey(material),
          finish: FINISH_KEY[finish],
          quantity: 1,
        }),
      });
      if (!res.ok) throw new Error("No disponible");
      return (await res.json()) as { quote: { total_cop: number } };
    },
  });

  if (!est || !material) return null;

  return (
    <div className="rounded-2xl border border-[var(--brand-orange)] bg-[color-mix(in_oklab,var(--brand-orange)_8%,white)] p-4">
      <p className="text-xs font-bold uppercase tracking-wide text-[var(--brand-wine)]">
        Precio orientativo
      </p>
      <p className="mt-1 text-2xl font-black">
        {isFetching || !data
          ? "Calculando…"
          : `Desde ${data.quote.total_cop.toLocaleString("es-CO", {
              style: "currency",
              currency: "COP",
              maximumFractionDigits: 0,
            })}`}
      </p>
      <p className="mt-1 text-xs text-muted-foreground">
        Estimado automático para {size.toLowerCase()} en {materialKey(material)}. El precio final se
        confirma al revisar tu archivo.
      </p>
    </div>
  );
}



export function Quoter() {
  const [design, setDesign] = useState("archivo");
  const [size, setSize] = useState("");
  const [material, setMaterial] = useState("");
  const [finish, setFinish] = useState<Finish>("estandar");
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const { data: content } = useQuery(siteContentQuery());
  const contact = getContactInfo(content);
  const saveQuote = useServerFn(createQuoteRequest);

  const isLarge = size === LARGE_FORMAT;

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
    if (fileError) return;
    const form = e.currentTarget;
    const data = new FormData(form);

    const length_cm = isLarge ? Number(data.get("length_cm")) : null;
    const width_cm = isLarge ? Number(data.get("width_cm")) : null;
    const height_cm = isLarge ? Number(data.get("height_cm")) : null;

    const designLabel =
      design === "archivo" ? "Ya tengo el archivo 3D" : "Necesito diseño 3D personalizado";
    const finishLabel = finishes.find((x) => x.id === finish)?.title ?? "";

    setSending(true);
    setSendError(null);
    try {
      let file_path: string | null = null;
      let file_name: string | null = null;
      if (file) {
        const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
        const path = `cotizaciones/${crypto.randomUUID()}-${safe}`;
        const up = await supabase.storage.from("quote-files").upload(path, file, {
          upsert: false,
        });
        if (up.error) throw new Error("No pudimos subir el archivo: " + up.error.message);
        file_path = path;
        file_name = file.name;
      }

      await saveQuote({
        data: {
          customer_name: String(data.get("name") ?? ""),
          customer_email: String(data.get("email") ?? ""),
          customer_phone: String(data.get("phone") ?? ""),
          design_state: designLabel,
          size_label: size,
          length_cm,
          width_cm,
          height_cm,
          material,
          finish: finishLabel,
          notes: "",
          file_name,
          file_path,
        },
      });

      const lines = [
        `Hola Will Design 3D, quiero cotizar un proyecto:`,
        ``,
        `👤 Nombre: ${data.get("name")}`,
        `✉️ Correo: ${data.get("email")}`,
        `📱 WhatsApp: ${data.get("phone")}`,
        ``,
        `🧩 Estado del diseño: ${designLabel}`,
        `📐 Tamaño: ${size}`,
        isLarge ? `📏 Medidas aprox.: ${length_cm} × ${width_cm} × ${height_cm} cm` : "",
        `🧪 Material: ${material}`,
        `✨ Acabado: ${finishLabel}`,
        file_name ? `📎 Archivo adjunto enviado al equipo: ${file_name}` : "",
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
    <section
      id="cotizador"
      className="mx-auto max-w-7xl px-4 py-16 sm:px-6 md:py-24"
    >
      <div className="mx-auto max-w-3xl text-center">
        <span className="chip-teal">Cotizador</span>
        <h2 className="mt-3 text-3xl font-black sm:text-4xl md:text-5xl">
          Cotizador de{" "}
          <span style={{ color: "var(--brand-orange)" }}>Proyectos 3D</span>
        </h2>
        <p className="mt-3 text-muted-foreground">
          Cuéntanos los detalles y te enviamos una cotización exacta por
          WhatsApp.
        </p>
      </div>

      <div className="mx-auto mt-10 max-w-3xl rounded-3xl border border-border bg-card p-6 shadow-sm sm:p-8">
        {/* Kiara header */}
        <div className="flex items-start gap-3">
          <img
            src={kiaraAsset.url}
            alt="Kiara"
            width={56}
            height={56}
            className="h-14 w-14 shrink-0 rounded-full object-cover ring-2 ring-[var(--brand-orange)]"
          />
          <div
            className="relative rounded-2xl border border-border bg-background px-4 py-3 text-sm"
            style={{
              background:
                "color-mix(in oklab, var(--brand-orange) 10%, white)",
            }}
          >
            <span
              aria-hidden
              className="absolute -left-1.5 top-4 h-3 w-3 rotate-45 border-b border-l border-border"
              style={{
                background:
                  "color-mix(in oklab, var(--brand-orange) 10%, white)",
              }}
            />
            <strong>¡Guau!</strong> Detalla tu proyecto aquí y yo le pasaré el
            dato al equipo 🐾
          </div>
        </div>

        <form onSubmit={onSubmit} className="mt-8 grid gap-7">
          {/* Estado del diseño */}
          <fieldset>
            <legend className="text-sm font-bold">Estado del Diseño</legend>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {[
                { id: "archivo", label: "Ya tengo el archivo 3D (.STL, .OBJ)" },
                { id: "diseno", label: "Necesito diseño 3D personalizado" },
              ].map((o) => (
                <label
                  key={o.id}
                  className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 text-sm transition ${
                    design === o.id
                      ? "border-[var(--brand-orange)] bg-[color-mix(in_oklab,var(--brand-orange)_8%,white)]"
                      : "border-border hover:bg-muted"
                  }`}
                >
                  <input
                    type="radio"
                    name="design"
                    value={o.id}
                    checked={design === o.id}
                    onChange={() => setDesign(o.id)}
                    className="h-4 w-4 accent-[var(--brand-orange)]"
                  />
                  <span className="font-medium">{o.label}</span>
                </label>
              ))}
            </div>
          </fieldset>

          {/* Tamaño */}
          <label className="grid gap-2 text-sm">
            <span className="font-bold">Tamaño del Proyecto</span>
            <select
              required
              value={size}
              onChange={(e) => setSize(e.target.value)}
              className="rounded-xl border border-input bg-background px-3 py-2.5 outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">Selecciona un tamaño…</option>
              <option>Pequeño (hasta 10x10 cm)</option>
              <option>Mediano (hasta 30x30 cm)</option>
              <option>{LARGE_FORMAT}</option>
            </select>
          </label>

          {/* Medidas para gran formato */}
          {isLarge && (
            <fieldset className="rounded-2xl border border-[var(--brand-teal)] bg-[color-mix(in_oklab,var(--brand-teal)_7%,white)] p-4">
              <legend className="px-1 text-sm font-bold">
                Medidas aproximadas (cm)
              </legend>
              <p className="text-xs text-muted-foreground">
                Para gran formato necesitamos las medidas para cotizar con precisión.
              </p>
              <div className="mt-3 grid gap-3 sm:grid-cols-3">
                {[
                  { name: "length_cm", label: "Largo (cm)" },
                  { name: "width_cm", label: "Ancho (cm)" },
                  { name: "height_cm", label: "Alto (cm)" },
                ].map((d) => (
                  <label key={d.name} className="grid gap-1 text-sm">
                    <span className="font-medium">{d.label}</span>
                    <input
                      name={d.name}
                      type="number"
                      required
                      min={1}
                      max={10000}
                      step="0.1"
                      placeholder="Ej: 60"
                      className="rounded-xl border border-input bg-background px-3 py-2 outline-none focus:ring-2 focus:ring-ring"
                    />
                  </label>
                ))}
              </div>
            </fieldset>
          )}

          {/* Material */}
          <label className="grid gap-2 text-sm">
            <span className="font-bold">Tecnología y Material deseado</span>
            <select
              required
              value={material}
              onChange={(e) => setMaterial(e.target.value)}
              className="rounded-xl border border-input bg-background px-3 py-2.5 outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">Selecciona un material…</option>
              <option>Filamento (PLA, PETG, ABS) — resistente y prototipos</option>
              <option>Filamento Flexible (TPU)</option>
              <option>Resina — miniaturas y alto detalle</option>
              <option>No estoy seguro, necesito asesoría</option>
            </select>
          </label>

          {/* Acabado */}
          <fieldset>
            <legend className="text-sm font-bold">
              Nivel de Post-procesado y Acabado
            </legend>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              {finishes.map((o) => {
                const active = finish === o.id;
                return (
                  <label
                    key={o.id}
                    className={`relative flex cursor-pointer flex-col gap-1 rounded-2xl border p-4 text-sm transition ${
                      active
                        ? "border-[var(--brand-orange)] bg-[color-mix(in_oklab,var(--brand-orange)_8%,white)] shadow-sm"
                        : "border-border hover:bg-muted"
                    }`}
                  >
                    <input
                      type="radio"
                      name="finish"
                      value={o.id}
                      checked={active}
                      onChange={() => setFinish(o.id)}
                      className="sr-only"
                    />
                    {active && (
                      <CheckCircle2
                        className="absolute right-3 top-3 h-4 w-4"
                        style={{ color: "var(--brand-orange)" }}
                      />
                    )}
                    <span className="font-bold">{o.title}</span>
                    <span className="text-xs text-muted-foreground">
                      {o.desc}
                    </span>
                  </label>
                );
              })}
            </div>
          </fieldset>

          <LiveEstimate size={size} material={material} finish={finish} />



          {/* Archivo */}
          <div className="grid gap-2 text-sm">
            <span className="font-bold">Archivo 3D o imagen de referencia</span>
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
              className={`rounded-2xl border-2 border-dashed p-5 text-center transition ${
                dragging
                  ? "border-[var(--brand-teal)] bg-[color-mix(in_oklab,var(--brand-teal)_8%,white)]"
                  : "border-border bg-background"
              }`}
            >
              <Upload className="mx-auto h-5 w-5 text-muted-foreground" />
              <p className="mt-2 text-sm font-semibold">
                Arrastra tu archivo aquí o
              </p>
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className="mt-2 rounded-full border border-border bg-card px-4 py-2 text-sm font-semibold hover:bg-muted"
              >
                Seleccionar archivo
              </button>
              <input
                ref={inputRef}
                type="file"
                accept=".stl,.obj,.jpg,.jpeg,.png"
                className="hidden"
                onChange={(e) => {
                  pickFile(e.target.files);
                  e.target.value = "";
                }}
              />
              <p className="mt-2 text-xs text-muted-foreground">
                Formatos permitidos: .stl, .obj, .jpg, .png — máximo 50 MB.
              </p>

              {file && (
                <div className="mx-auto mt-4 flex max-w-md items-center justify-between gap-3 rounded-xl border border-border bg-card px-3 py-2 text-left">
                  <span className="min-w-0 flex-1 truncate text-sm font-medium">
                    {file.name}
                    <span className="ml-2 text-xs text-muted-foreground">
                      {(file.size / 1024 / 1024).toFixed(1)} MB
                    </span>
                  </span>
                  <button
                    type="button"
                    aria-label="Quitar archivo"
                    onClick={() => setFile(null)}
                    className="rounded-full p-1 hover:bg-muted"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>
            {fileError && (
              <p
                role="alert"
                className="flex items-start gap-2 rounded-xl border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs font-semibold text-destructive"
              >
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                {fileError}
              </p>
            )}
          </div>

          {/* Contacto */}
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="grid gap-1 text-sm">
              <span className="font-medium">Nombre</span>
              <input
                name="name"
                required
                maxLength={100}
                className="rounded-xl border border-input bg-background px-3 py-2 outline-none focus:ring-2 focus:ring-ring"
                placeholder="Tu nombre"
              />
            </label>
            <label className="grid gap-1 text-sm">
              <span className="font-medium">Correo electrónico</span>
              <input
                name="email"
                type="email"
                required
                maxLength={200}
                className="rounded-xl border border-input bg-background px-3 py-2 outline-none focus:ring-2 focus:ring-ring"
                placeholder="tu@correo.com"
              />
            </label>
            <label className="grid gap-1 text-sm">
              <span className="font-medium">Teléfono (WhatsApp)</span>
              <input
                name="phone"
                type="tel"
                required
                maxLength={30}
                className="rounded-xl border border-input bg-background px-3 py-2 outline-none focus:ring-2 focus:ring-ring"
                placeholder="+57 300 000 0000"
              />
            </label>
          </div>

          {sendError && (
            <p
              role="alert"
              className="rounded-xl border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm font-semibold text-destructive"
            >
              {sendError}
            </p>
          )}
          {sent && !sendError && (
            <p className="rounded-xl border border-border bg-muted px-3 py-2 text-sm font-semibold">
              ¡Listo! Recibimos tu cotización y abrimos WhatsApp para confirmar los
              detalles.
            </p>
          )}

          <button
            type="submit"
            disabled={sending}
            className="btn-primary mt-2 w-full justify-center py-3 text-base disabled:opacity-60"
          >
            {sending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Enviando…
              </>
            ) : (
              <>
                Solicitar Cotización Exacta
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </form>
      </div>
    </section>
  );
}
