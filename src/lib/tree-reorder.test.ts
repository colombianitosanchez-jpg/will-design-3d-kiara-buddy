import { describe, expect, it } from "vitest";
import { applySiblingOrder, resolveSiblingReorder } from "./tree-reorder";

type Item = {
  id: string;
  parent_id: string | null;
  sort_order: number;
  name: string;
};

const sampleTree: Item[] = [
  { id: "root-a", parent_id: null, sort_order: 0, name: "Impresoras" },
  { id: "child-a1", parent_id: "root-a", sort_order: 0, name: "FDM" },
  { id: "child-a2", parent_id: "root-a", sort_order: 1, name: "Resina" },
  { id: "root-b", parent_id: null, sort_order: 1, name: "Filamentos" },
  { id: "child-b1", parent_id: "root-b", sort_order: 0, name: "PLA" },
  { id: "child-b2", parent_id: "root-b", sort_order: 1, name: "PETG" },
  { id: "root-c", parent_id: null, sort_order: 2, name: "Accesorios" },
];

describe("resolveSiblingReorder", () => {
  it("reordena ítems raíz entre sí", () => {
    const res = resolveSiblingReorder(sampleTree, "root-a", "root-c");
    expect(res?.parentId).toBeNull();
    expect(res?.reorderedSiblings.map((x) => x.id)).toEqual(["root-b", "root-c", "root-a"]);
  });

  it("reordena hijos que comparten el mismo padre", () => {
    const res = resolveSiblingReorder(sampleTree, "child-a2", "child-a1");
    expect(res?.parentId).toBe("root-a");
    expect(res?.reorderedSiblings.map((x) => x.id)).toEqual(["child-a2", "child-a1"]);
  });

  it("resuelve al hermano ancestro cuando se suelta un ítem raíz sobre un hijo de otro hermano", () => {
    const res = resolveSiblingReorder(sampleTree, "root-a", "child-b2");
    expect(res?.parentId).toBeNull();
    expect(res?.reorderedSiblings.map((x) => x.id)).toEqual(["root-b", "root-a", "root-c"]);
  });

  it("ignora soltar un padre sobre su propio descendiente", () => {
    expect(resolveSiblingReorder(sampleTree, "root-a", "child-a1")).toBeNull();
  });

  it("ignora mover un hijo hacia una rama de otro padre distinto", () => {
    expect(resolveSiblingReorder(sampleTree, "child-a1", "child-b1")).toBeNull();
    expect(resolveSiblingReorder(sampleTree, "child-a1", "root-b")).toBeNull();
  });

  it("applySiblingOrder actualiza los índices secuenciales sin alterar otros nodos", () => {
    const res = resolveSiblingReorder(sampleTree, "root-c", "root-a");
    expect(res).not.toBeNull();
    const updated = applySiblingOrder(sampleTree, res!.reorderedSiblings, "sort_order");
    expect(updated.find((x) => x.id === "root-c")?.sort_order).toBe(0);
    expect(updated.find((x) => x.id === "root-a")?.sort_order).toBe(1);
    expect(updated.find((x) => x.id === "root-b")?.sort_order).toBe(2);
    expect(updated.find((x) => x.id === "child-a2")?.sort_order).toBe(1);
  });
});
