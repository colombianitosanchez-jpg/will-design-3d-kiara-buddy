export type PanelRouteDescriptor = {
  to: string;
  exact?: boolean;
  superOnly: boolean;
};

/**
 * Determina si una ruta del panel administrativo está reservada exclusivamente para Super Admin
 * comparando el pathname actual contra los descriptores de rutas (con soporte para subrutas y slash final).
 */
export function isSuperOnlyPanelPath(
  pathname: string,
  links: readonly PanelRouteDescriptor[],
): boolean {
  const normalized = pathname.replace(/\/+$/, "") || "/";
  return links.some((link) => {
    if (!link.superOnly) return false;
    const target = link.to.replace(/\/+$/, "") || "/";
    if (link.exact) return normalized === target;
    return normalized === target || normalized.startsWith(`${target}/`);
  });
}

export type KiaraTabKey = "perfil" | "llm" | "prompts" | "knowledge";

/** Pestaña inicial segura según el rol: los empleados aterrizan siempre en Base de Conocimiento. */
export function getDefaultKiaraTab(isSuperAdmin: boolean): KiaraTabKey {
  return isSuperAdmin ? "perfil" : "knowledge";
}

/** Pestañas visibles en /panel/kiara según el rol actual. */
export function getVisibleKiaraTabs(isSuperAdmin: boolean): KiaraTabKey[] {
  return isSuperAdmin ? ["perfil", "llm", "prompts", "knowledge"] : ["knowledge"];
}
