import {
  createFileRoute,
  Outlet,
  Link,
  useNavigate,
  useRouterState,
} from "@tanstack/react-router";
import { useEffect } from "react";
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
  SlidersHorizontal,
  BellRing,
  UsersRound,
  LogOut,
  ShieldCheck,
  GalleryHorizontal,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

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

const ALL_LINKS = [
  { to: "/panel", label: "Inicio", icon: LayoutDashboard, exact: true, superOnly: false },
  { to: "/panel/productos", label: "Productos", icon: Package, superOnly: false },
  { to: "/panel/pedidos", label: "Pedidos", icon: ShoppingCart, superOnly: false },
  { to: "/panel/conocimiento", label: "Base de Conocimiento", icon: BookOpen, superOnly: false },
  { to: "/panel/taxonomia", label: "Categorías y marcas", icon: Tags, superOnly: true },
  { to: "/panel/cotizador", label: "Cotizador", icon: Calculator, superOnly: true },
  { to: "/panel/cotizaciones", label: "Reglas de precios", icon: SlidersHorizontal, superOnly: true },
  { to: "/panel/notificaciones", label: "Notificaciones", icon: BellRing, superOnly: true },
  { to: "/panel/menu", label: "Menú de navegación", icon: ListTree, superOnly: true },
  { to: "/panel/contenido", label: "Contenido", icon: FileText, superOnly: true },
  { to: "/panel/carrusel", label: "Carrusel", icon: GalleryHorizontal, superOnly: true },
  { to: "/panel/llm", label: "Configuración de LLM", icon: Bot, superOnly: true },
  { to: "/panel/equipo", label: "Equipo", icon: UsersRound, superOnly: true },
];

function PanelLayout() {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { user, role, isActive, isSuperAdmin, hasPanelAccess, loading, signOut } = useAuth();

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login", replace: true });
  }, [loading, user, navigate]);

  async function handleSignOut() {
    await signOut();
    navigate({ to: "/login", replace: true });
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

  const links = ALL_LINKS.filter((l) => isSuperAdmin || !l.superOnly);

  return (
    <div className="mx-auto flex max-w-7xl gap-6 px-4 py-8 sm:px-6">
      <aside className="hidden w-56 shrink-0 md:block">
        <div className="sticky top-24 space-y-1 rounded-3xl border border-border bg-card p-3">
          {links.map((l) => {
            const active = l.exact ? pathname === l.to : pathname.startsWith(l.to);
            return (
              <Link
                key={l.to}
                to={l.to}
                className={`flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold transition ${
                  active ? "bg-[var(--brand-wine)] text-white" : "hover:bg-muted"
                }`}
              >
                <l.icon className="h-4 w-4" />
                {l.label}
              </Link>
            );
          })}
          <button
            onClick={handleSignOut}
            className="mt-2 flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold text-muted-foreground hover:bg-muted"
          >
            <LogOut className="h-4 w-4" />
            Cerrar sesión
          </button>
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
        <div className="mb-4 flex gap-2 overflow-x-auto md:hidden">
          {links.map((l) => {
            const active = l.exact ? pathname === l.to : pathname.startsWith(l.to);
            return (
              <Link
                key={l.to}
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
        <Outlet />
      </div>
    </div>
  );
}
