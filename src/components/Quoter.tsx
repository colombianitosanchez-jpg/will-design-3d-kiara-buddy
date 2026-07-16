import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Upload, CheckCircle2 } from "lucide-react";
import kiaraAsset from "@/assets/kiara.asset.json";
import { siteContentQuery, getContactInfo, waLink } from "@/lib/catalog";


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

export function Quoter() {
  const [design, setDesign] = useState("archivo");
  const [size, setSize] = useState("");
  const [material, setMaterial] = useState("");
  const [finish, setFinish] = useState<Finish>("estandar");
  const [fileName, setFileName] = useState("");
  const { data: content } = useQuery(siteContentQuery());
  const contact = getContactInfo(content);

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {

    e.preventDefault();
    const f = e.currentTarget;
    const data = new FormData(f);
    const lines = [
      `Hola Will Design 3D, quiero cotizar un proyecto:`,
      ``,
      `👤 Nombre: ${data.get("name")}`,
      `✉️ Correo: ${data.get("email")}`,
      `📱 WhatsApp: ${data.get("phone")}`,
      ``,
      `🧩 Estado del diseño: ${
        design === "archivo"
          ? "Ya tengo el archivo 3D"
          : "Necesito diseño 3D personalizado"
      }`,
      `📐 Tamaño: ${size}`,
      `🧪 Material: ${material}`,
      `✨ Acabado: ${finishes.find((x) => x.id === finish)?.title}`,
      fileName ? `📎 Archivo de referencia: ${fileName}` : "",
    ].filter(Boolean);
    window.open(waLink(contact.whatsapp, lines.join("\n")), "_blank");
  };


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
              <option>Gran Formato (50x50 cm o más — ¡Nuestra especialidad!)</option>
            </select>
          </label>

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

          {/* Archivo */}
          <div className="grid gap-2 text-sm">
            <span className="font-bold">Archivo 3D o imágenes de referencia</span>
            <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border bg-background px-4 py-5 text-sm font-semibold text-muted-foreground transition hover:border-[var(--brand-teal)] hover:text-foreground">
              <Upload className="h-4 w-4" />
              {fileName || "Sube tu archivo 3D o imágenes de referencia"}
              <input
                type="file"
                accept=".stl,.obj,.3mf,.step,.stp,image/*"
                multiple
                className="hidden"
                onChange={(e) => {
                  const files = e.target.files;
                  if (!files || files.length === 0) return setFileName("");
                  setFileName(
                    files.length === 1
                      ? files[0].name
                      : `${files.length} archivos seleccionados`,
                  );
                }}
              />
            </label>
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

          <button
            type="submit"
            className="btn-primary mt-2 w-full justify-center py-3 text-base"
          >
            Solicitar Cotización Exacta
            <ArrowRight className="h-4 w-4" />
          </button>
        </form>
      </div>
    </section>
  );
}
