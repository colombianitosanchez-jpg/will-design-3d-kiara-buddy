import { describe, expect, it } from "vitest";
import { getHomeEditorGroups } from "./home-editor-groups";

const groups = [
  "Orden de Secciones",
  "Hero Principal",
  "Estadísticas del Hero",
  "Portafolio y Redes",
  "Productos Destacados",
  "Sección Nosotros",
  "Nosotros Página Misión Visión",
  "Configuración Mensajes WhatsApp",
  "Cabecera de la Tienda",
];

describe("home editor section order", () => {
  it("moves both hero groups and both about groups with their respective sections", () => {
    expect(
      getHomeEditorGroups('["about","portfolio","quoter","products","services","hero"]', groups),
    ).toEqual([
      "Orden de Secciones",
      "Sección Nosotros",
      "Nosotros Página Misión Visión",
      "Portafolio y Redes",
      "Cotizador",
      "Productos Destacados",
      "Servicios",
      "Hero Principal",
      "Estadísticas del Hero",
      "Cabecera de la Tienda",
      "Configuración Mensajes WhatsApp",
    ]);
  });

  it("uses the homepage default order when no saved order exists", () => {
    expect(getHomeEditorGroups("", groups)).toEqual([
      "Orden de Secciones",
      "Hero Principal",
      "Estadísticas del Hero",
      "Servicios",
      "Productos Destacados",
      "Portafolio y Redes",
      "Cotizador",
      "Sección Nosotros",
      "Nosotros Página Misión Visión",
      "Cabecera de la Tienda",
      "Configuración Mensajes WhatsApp",
    ]);
  });

  it("keeps the ordering controls first and unrelated settings last after successive changes", () => {
    const first = getHomeEditorGroups('["products","hero"]', groups);
    const second = getHomeEditorGroups('["quoter","about","hero"]', groups);
    expect(first.slice(0, 2)).toEqual(["Orden de Secciones", "Productos Destacados"]);
    expect(second.slice(0, 4)).toEqual([
      "Orden de Secciones",
      "Cotizador",
      "Sección Nosotros",
      "Nosotros Página Misión Visión",
    ]);
    expect(second.slice(-2)).toEqual(["Cabecera de la Tienda", "Configuración Mensajes WhatsApp"]);
    expect(new Set(second).size).toBe(second.length);
  });
});
