import {
  createFileRoute,
  Outlet,
  Link,
  useNavigate,
  useRouterState,
} from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  FileText,
  ListTree,
  Tags,
  Bot,
  BookOpen,
  Calculator,
  CreditCard,
  SlidersHorizontal,
  BellRing,
  UsersRound,
  LogOut,
  ShieldCheck,
  GalleryHorizontal,
  Lock,
  Unlock,
  GripVertical,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  DndContext,
  PointerSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  horizontalListSortingStrategy,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { saveSidebarOrder, sidebarOrderQuery, sortByOrder } from "@/lib/sidebar-order";

export const Route = createFileRoute("/panel")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Panel del equipo · Will Design 3D" },
      { name: "description", content: "Panel privado para gestionar productos, pedidos, contenido y menú del sitio." },
      { name: "robots", content: "noindex, nofollow" },
      { property: "og:title", content: "Panel del equipo · Will Design 3D" },
      { property: "og:description", content: "Panel privado de gestión del sitio. Acceso restringido al equipo." },
    ],
  }),
  component: PanelLayout,
});

type PanelLink = {
  key: string;
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
  exact?: boolean;
  superOnly: boolean;
};

const ALL_LINKS: PanelLink[] = [
  { key: "inicio", to: "/panel", label: "Inicio", icon: LayoutDashboard, exact: true, superOnly: false },
  { key: "productos", to: "/panel/productos", label: "Productos", icon: Package, superOnly: false },
  { key: "pedidos", to: "/panel/pedidos", label: "Pedidos", icon: ShoppingCart, superOnly: false },
  { key: "conocimiento", to: "/panel/conocimiento", label: "Base de Conocimiento", icon: BookOpen, superOnly: false },
  { key: "taxonomia", to: "/panel/taxonomia", label: "Categorías y marcas", icon: Tags, superOnly: true },
  { key: "pagos", to: "/panel/pagos", label: "Métodos de pago", icon: CreditCard, superOnly: true },
  { key: "cotizador", to: "/panel/cotizador", label: "Cotizador", icon: Calculator, superOnly: true },
  { key: "cotizaciones", to: "/panel/cotizaciones", label: "Reglas de precios", icon: SlidersHorizontal, superOnly: true },
  { key: "notificaciones", to: "/panel/notificaciones", label: "Notificaciones", icon: BellRing, superOnly: true },
  { key: "menu", to: "/panel/menu", label: "Menú de navegación", icon: ListTree, superOnly: true },
  { key: "contenido", to: "/panel/contenido", label: "Contenido", icon: FileText, superOnly: true },
  { key: "carrusel", to: "/panel/carrusel", label: "Carrusel", icon: GalleryHorizontal, superOnly: true },
  { key: "llm", to: "/panel/llm", label: "Configuración de LLM", icon: Bot, superOnly: true },
  { key: "equipo", to: "/panel/equipo", label: "Equipo", icon: UsersRound, superOnly: true },
];

function SortableItem({
  link,
  variant,
}: {
  link: PanelLink;
  variant: "desktop" | "mobile";
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: link.key,
  });
  const style = { transform: CSS.Transform.toString(transform), transition };
  const base =
    variant === "desktop"
      ? "flex cursor-grab touch-none items-center gap-3 rounded-xl border border-dashed border-border px-3 py-2 text-sm font-semibold"
      : "flex shrink-0 cursor-grab touch-none items-center gap-1.5 rounded-full border border-dashed border-border px-3 py-1.5 text-xs font-semibold";

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`${base} ${isDragging ? "bg-muted opacity-80 shadow-md" : "bg-background"}`}
    >
      <GripVertical className="h-4 w-4 shrink-0 text-muted-foreground" />
      {variant === "desktop" && <link.icon className="h-4 w-4 shrink-0" />}
      <span className="truncate">{link.label}</span>
    </div>
  );
}

function PanelLayout() {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { user, role, isActive, isSuperAdmin, hasPanelAccess, loading, signOut } = useAuth();
  const queryClient = useQueryClient();

  const { data: settings } = useQuery({ ...sidebarOrderQuery(), enabled: hasPanelAccess });
  const [order, setOrder] = useState<string[] | null>(null);
  const [editMode, setEditMode] = useState(false);

  useEffect(() => {
    if (settings) setOrder(settings.sidebar_order);
  }, [settings]);

  useEffect(() => {
    if (!isSuperAdmin) setEditMode(false);
  }, [isSuperAdmin]);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login", replace: true });
  }, [loading, user, navigate]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
  );

  /** Orden global completo (incluye módulos no visibles para el rol actual). */
  const fullOrder = useMemo(
    () => sortByOrder(ALL_LINKS, order ?? []).map((l) => l.key),
    [order],
  );

  const sortedLinks = useMemo(() => sortByOrder(ALL_LINKS, order ?? []), [order]);
  const links = sortedLinks.filter((l) => isSuperAdmin || !l.superOnly);

  async function handleSignOut() {
    await signOut();
    navigate({ to: "/login", replace: true });
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id || !settings) return;
    const from = fullOrder.indexOf(String(active.id));
    const to = fullOrder.indexOf(String(over.id));
    if (from < 0 || to < 0) return;
    const previous = order;
    const next = arrayMove(fullOrder, from, to);
    setOrder(next);
    try {
      await saveSidebarOrder(settings.id, next);
      await queryClient.invalidateQueries({ queryKey: ["admin_settings", "sidebar_order"] });
      toast.success("Orden del menú guardado");
    } catch {
      setOrder(previous);
      toast.error("No se pudo guardar el nuevo orden");
    }
  }

  if (loading || !user) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-sm text-muted-foreground">Cargando panel…</div>
    );
  }

  if (!hasPanelAccess) {
    return (
      <div className="flex min-h-[80vh] items-center justify-center px-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <ShieldCheck className="h-10 w-10 text-[var(--brand-orange)]" />
            <CardTitle className="mt-2 text-2xl font-black">Cuenta en revisión</CardTitle>
            <CardDescription>
              Tu cuenta está en revisión. Contacta al administrador de Will Design 3D para obtener acceso.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs text-muted-foreground">
              {user.email} · estado: {role === "pending" ? "pendiente" : !isActive ? "inactiva" : role}
            </p>
            <Button variant="outline" className="w-full" onClick={handleSignOut}>
              Cerrar sesión
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const dragEnabled = editMode && isSuperAdmin;

  return (
    <div className="mx-auto flex max-w-7xl gap-6 px-4 pb-28 pt-8 sm:px-6 sm:pb-32">
      <aside className="hidden w-56 shrink-0 md:block">
        <div className="sticky top-24 space-y-1 rounded-3xl border border-border bg-card p-3">
          {dragEnabled ? (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={links.map((l) => l.key)} strategy={verticalListSortingStrategy}>
                <div className="space-y-1">
                  {links.map((l) => (
                    <SortableItem key={l.key} link={l} variant="desktop" />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          ) : (
            links.map((l) => {
              const active = l.exact ? pathname === l.to : pathname.startsWith(l.to);
              return (
                <Link
                  key={l.key}
                  to={l.to}
                  className={`flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold transition ${
                    active ? "bg-[var(--brand-wine)] text-white" : "hover:bg-muted"
                  }`}
                >
                  <l.icon className="h-4 w-4" />
                  {l.label}
                </Link>
              );
            })
          )}
          <button
            onClick={handleSignOut}
            className="mt-2 flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold text-muted-foreground hover:bg-muted"
          >
            <LogOut className="h-4 w-4" />
            Cerrar sesión
          </button>
          {isSuperAdmin && (
            <button
              onClick={() => setEditMode((v) => !v)}
              aria-pressed={editMode}
              className={`mt-1 flex w-full items-center gap-3 rounded-xl px-3 py-2 text-xs font-semibold transition ${
                editMode ? "bg-[var(--brand-orange)] text-white" : "text-muted-foreground hover:bg-muted"
              }`}
            >
              {editMode ? <Unlock className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
              {editMode ? "Modo edición activo" : "Modo edición"}
            </button>
          )}
          {dragEnabled && (
            <p className="px-3 pt-1 text-[11px] text-muted-foreground">
              Arrastra los módulos para cambiar el orden. Se guarda automáticamente.
            </p>
          )}
          <div className="mt-3 border-t border-border pt-3">
            <p className="text-[11px] text-muted-foreground">{user.email}</p>
            <p
              className="mt-1 text-[10px] font-bold uppercase tracking-wider"
              style={{ color: isSuperAdmin ? "var(--brand-orange)" : "var(--brand-teal-deep)" }}
            >
              {isSuperAdmin ? "Super Admin" : "Empleado"}
            </p>
          </div>
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        {/* mobile nav */}
        <div className="mb-4 md:hidden">
          {dragEnabled ? (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={links.map((l) => l.key)} strategy={horizontalListSortingStrategy}>
                <div className="flex flex-wrap gap-2">
                  {links.map((l) => (
                    <SortableItem key={l.key} link={l} variant="mobile" />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          ) : (
            <div className="flex gap-2 overflow-x-auto">
              {links.map((l) => {
                const active = l.exact ? pathname === l.to : pathname.startsWith(l.to);
                return (
                  <Link
                    key={l.key}
                    to={l.to}
                    className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold ${
                      active ? "bg-[var(--brand-wine)] text-white" : "bg-muted"
                    }`}
                  >
                    {l.label}
                  </Link>
                );
              })}
            </div>
          )}
          {isSuperAdmin && (
            <button
              onClick={() => setEditMode((v) => !v)}
              aria-pressed={editMode}
              className={`mt-2 flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold ${
                editMode ? "bg-[var(--brand-orange)] text-white" : "border border-border text-muted-foreground"
              }`}
            >
              {editMode ? <Unlock className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}
              {editMode ? "Terminar de ordenar" : "Ordenar menú"}
            </button>
          )}
        </div>
        <Outlet />
      </div>
    </div>
  );
}
