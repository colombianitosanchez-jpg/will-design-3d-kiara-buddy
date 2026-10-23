/** Secciones del inicio que el Super Admin puede reordenar desde /panel/contenido. */
export const HOME_SECTIONS = [
  { key: "hero", label: "Carrusel principal" },
  { key: "services", label: "Servicios" },
  { key: "products", label: "Productos destacados" },
  { key: "portfolio", label: "Portafolio e Instagram" },
  { key: "quoter", label: "Cotizador" },
  { key: "about", label: "Nosotros" },
] as const;

export type HomeSectionKey = (typeof HOME_SECTIONS)[number]["key"];

const ALL = HOME_SECTIONS.map((s) => s.key) as HomeSectionKey[];

/** Orden guardado (JSON) → orden válido; secciones nuevas o faltantes se agregan al final. */
export function parseHomeOrder(raw: string | null | undefined): HomeSectionKey[] {
  let list: unknown = [];
  try {
    list = raw ? JSON.parse(raw) : [];
  } catch {
    list = [];
  }
  const saved = Array.isArray(list)
    ? list.filter((k): k is HomeSectionKey => ALL.includes(k as HomeSectionKey))
    : [];
  const unique = Array.from(new Set(saved));
  return [...unique, ...ALL.filter((k) => !unique.includes(k))];
}
