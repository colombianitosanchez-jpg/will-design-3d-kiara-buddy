import { describe, expect, test } from "vitest";
import {
  getDefaultKiaraTab,
  getVisibleKiaraTabs,
  isSuperOnlyPanelPath,
  type PanelRouteDescriptor,
} from "./panel-access";

const PANEL_LINKS_SAMPLE: PanelRouteDescriptor[] = [
  { to: "/panel/marca", superOnly: true },
  { to: "/panel/kiara", superOnly: false },
  { to: "/panel", exact: true, superOnly: false },
  { to: "/panel/productos", superOnly: false },
  { to: "/panel/taxonomia", superOnly: true },
  { to: "/panel/contenido", superOnly: true },
  { to: "/panel/carrusel", superOnly: true },
  { to: "/panel/servicios", superOnly: true },
  { to: "/panel/menu", superOnly: true },
  { to: "/panel/equipo", superOnly: true },
  { to: "/panel/cotizador", superOnly: true },
  { to: "/panel/pedidos", superOnly: false },
  { to: "/panel/pagos", superOnly: true },
  { to: "/panel/notificaciones", superOnly: true },
];

describe("Control de acceso del panel por rol", () => {
  test("bloquea todas las rutas superOnly para empleados incluyendo subrutas y slash final", () => {
    const restrictedPaths = [
      "/panel/marca",
      "/panel/marca/",
      "/panel/contenido",
      "/panel/carrusel",
      "/panel/servicios",
      "/panel/cotizador",
      "/panel/taxonomia",
      "/panel/menu",
      "/panel/equipo",
      "/panel/pagos",
      "/panel/notificaciones",
      "/panel/notificaciones/config",
    ];

    for (const path of restrictedPaths) {
      expect(isSuperOnlyPanelPath(path, PANEL_LINKS_SAMPLE)).toBe(true);
    }
  });

  test("permite acceso de empleados a Dashboard, Productos, Pedidos y Kiara IA", () => {
    const allowedPaths = [
      "/panel",
      "/panel/",
      "/panel/productos",
      "/panel/productos/nuevo",
      "/panel/pedidos",
      "/panel/kiara",
    ];

    for (const path of allowedPaths) {
      expect(isSuperOnlyPanelPath(path, PANEL_LINKS_SAMPLE)).toBe(false);
    }
  });

  test("restringe pestañas de /panel/kiara a knowledge para empleados y mantiene todas para Super Admin", () => {
    expect(getDefaultKiaraTab(false)).toBe("knowledge");
    expect(getVisibleKiaraTabs(false)).toEqual(["knowledge"]);

    expect(getDefaultKiaraTab(true)).toBe("perfil");
    expect(getVisibleKiaraTabs(true)).toEqual(["perfil", "llm", "prompts", "knowledge"]);
  });
});
