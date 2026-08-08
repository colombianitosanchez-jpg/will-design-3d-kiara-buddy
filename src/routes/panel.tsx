import {
  createFileRoute,
  Outlet,
  Link,
  useNavigate,
  useRouterState,
  redirect,
} from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  FileText,
  ListTree,
  Bot,
  BookOpen,


  LogOut,
  ShieldCheck,
} from "lucide-react";

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

  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/auth" });
  },
  component: PanelLayout,
});

function PanelLayout() {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [email, setEmail] = useState<string>("");
  

  async function refreshRole() {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      navigate({ to: "/auth" });
      return;
    }
    setEmail(userData.user.email ?? "");
    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userData.user.id);
    setIsAdmin(Boolean(data?.some((r) => r.role === "admin" || r.role === "staff")));
  }

  useEffect(() => {
    refreshRole();
  }, []);


  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/auth" });
  }

  const links = [
    { to: "/panel", label: "Inicio", icon: LayoutDashboard, exact: true },
    { to: "/panel/productos", label: "Productos", icon: Package },
    { to: "/panel/pedidos", label: "Pedidos", icon: ShoppingCart },
    { to: "/panel/menu", label: "Menú de navegación", icon: ListTree },
    { to: "/panel/contenido", label: "Contenido", icon: FileText },
    { to: "/panel/llm", label: "Configuración de LLM", icon: Bot },

  ];

  if (isAdmin === false) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16">
        <div className="rounded-3xl border border-border bg-card p-8 shadow-sm">
          <ShieldCheck className="h-10 w-10 text-[var(--brand-orange)]" />
          <h1 className="mt-4 text-2xl font-black">Sin permisos aún</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Tu cuenta ({email}) no tiene rol de administrador.
          </p>
          <p className="mt-4 text-sm">
            Pide a un administrador que te asigne un rol desde la base de datos
            para acceder al panel.
          </p>
          <button
            onClick={signOut}
            className="mt-3 w-full rounded-full border border-border px-5 py-3 text-sm font-semibold"
          >
            Cerrar sesión
          </button>
        </div>
      </div>
    );
  }

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
            onClick={signOut}
            className="mt-2 flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold text-muted-foreground hover:bg-muted"
          >
            <LogOut className="h-4 w-4" />
            Cerrar sesión
          </button>
          <p className="mt-3 border-t border-border pt-3 text-[11px] text-muted-foreground">
            {email}
          </p>
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
