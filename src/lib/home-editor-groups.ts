import { parseHomeOrder, type HomeSectionKey } from "./home-sections";

export const SECTION_GROUPS: Record<HomeSectionKey, readonly string[]> = {
  hero: ["Hero Principal", "Estadísticas del Hero"],
  services: ["Servicios"],
  products: ["Productos Destacados"],
  portfolio: ["Portafolio y Redes"],
  quoter: ["Cotizador"],
  about: ["Sección Nosotros", "Nosotros Página Misión Visión"],
};

/** Derive editor order from the same saved value as the homepage, without local ordering state. */
export function getHomeEditorGroups(
  raw: string | null | undefined,
  availableGroups: readonly string[],
): string[] {
  const ordered = [
    "Orden de Secciones",
    ...parseHomeOrder(raw).flatMap((section) => SECTION_GROUPS[section]),
  ];
  const trailing = ["Cabecera de la Tienda", "Configuración Mensajes WhatsApp"];
  const extra = availableGroups.filter(
    (group) => !ordered.includes(group) && !trailing.includes(group),
  );
  return [...ordered, ...extra, ...trailing.filter((group) => availableGroups.includes(group))];
}
