/** Secciones de la página de inicio que el Super Admin puede ordenar y ocultar. */
export const HOME_SECTIONS = [
  { id: "hero", label: "Carrusel / portada" },
  { id: "services", label: "Servicios" },
  { id: "products", label: "Productos destacados" },
  { id: "portfolio", label: "Portafolio / Instagram" },
  { id: "quoter", label: "Cotizador" },
] as const;

export type HomeSectionId = (typeof HOME_SECTIONS)[number]["id"];
export type HomeSectionItem = { id: HomeSectionId; visible: boolean };

const IDS = HOME_SECTIONS.map((s) => s.id) as readonly string[];

/** Lee el orden guardado; secciones nuevas o faltantes se añaden al final visibles. */
export function parseHomeSections(raw: string | null | undefined): HomeSectionItem[] {
  let list: unknown = [];
  try {
    list = raw ? JSON.parse(raw) : [];
  } catch {
    list = [];
  }
  const out: HomeSectionItem[] = [];
  if (Array.isArray(list)) {
    for (const it of list) {
      const id = typeof it === "string" ? it : (it as { id?: unknown })?.id;
      if (typeof id === "string" && IDS.includes(id) && !out.some((o) => o.id === id)) {
        out.push({ id: id as HomeSectionId, visible: (it as { visible?: unknown })?.visible !== false });
      }
    }
  }
  for (const s of HOME_SECTIONS) if (!out.some((o) => o.id === s.id)) out.push({ id: s.id, visible: true });
  return out;
}
