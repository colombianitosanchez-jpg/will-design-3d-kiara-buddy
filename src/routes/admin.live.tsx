import { createFileRoute, redirect, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Radio, Save, Power, PowerOff } from "lucide-react";
import { setLive, useLive, type LivePlatform } from "@/lib/live-store";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/admin/live")({
  ssr: false,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/auth" });
  },
  head: () => ({
    meta: [
      { title: "Admin — Transmisión en vivo · Will Design 3D" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminLive,
});

function AdminLive() {
  const [status, setStatus] = useState<"loading" | "denied" | "ok">("loading");

  useEffect(() => {
    (async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return setStatus("denied");
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userData.user.id);
      const rows = (data ?? []) as { role: string }[];
      const allowed = rows.some((r) => r.role === "admin" || r.role === "staff");
      setStatus(allowed ? "ok" : "denied");
    })();
  }, []);

  if (status === "loading") {
    return (
      <div className="grid min-h-[60vh] place-items-center text-sm text-muted-foreground">
        Verificando permisos…
      </div>
    );
  }

  if (status === "denied") {
    return (
      <div className="grid min-h-[60vh] place-items-center p-4">
        <div className="max-w-md rounded-3xl border border-border bg-card p-6 text-center shadow-xl">
          <h1 className="text-lg font-black">Acceso restringido</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Necesitas una cuenta con rol de administrador o staff para gestionar
            la transmisión en vivo.
          </p>
          <Link
            to="/auth"
            className="btn-primary mt-4 inline-flex justify-center"
          >
            Iniciar sesión
          </Link>
        </div>
      </div>
    );
  }

  return <LivePanel />;
}

function LivePanel() {
  const live = useLive();
  const [platform, setPlatform] = useState<LivePlatform>(live.platform);
  const [url, setUrl] = useState(live.url);

  useEffect(() => {
    setPlatform(live.platform);
    setUrl(live.url);
  }, [live.platform, live.url]);

  const toggle = () => {
    setLive({ isLive: !live.isLive, platform, url });
  };

  return (
    <div className="min-h-screen bg-background p-4 sm:p-8">
      <div className="mx-auto max-w-2xl">
        <div className="flex items-center gap-3">
          <Radio
            className="h-8 w-8"
            style={{ color: "var(--brand-orange)" }}
          />
          <div>
            <h1 className="text-2xl font-black">Transmisión en vivo</h1>
            <p className="text-sm text-muted-foreground">
              Activa el banner y el aviso de Kiara cuando estés transmitiendo.
            </p>
          </div>
        </div>

        <div className="mt-6 rounded-3xl border border-border bg-card p-6 shadow-sm">
          <div
            className="flex items-center justify-between rounded-2xl p-4"
            style={{
              background: live.isLive
                ? "color-mix(in oklab, #dc2626 12%, white)"
                : "color-mix(in oklab, var(--brand-teal) 8%, white)",
            }}
          >
            <div>
              <p className="text-sm font-bold">Estado actual</p>
              <p className="text-2xl font-black">
                {live.isLive ? "🔴 EN VIVO" : "⚫ Fuera del aire"}
              </p>
            </div>
            <button
              onClick={toggle}
              className="btn-primary"
              style={{
                background: live.isLive ? "#dc2626" : undefined,
              }}
            >
              {live.isLive ? (
                <>
                  <PowerOff className="h-4 w-4" /> Terminar
                </>
              ) : (
                <>
                  <Power className="h-4 w-4" /> Iniciar
                </>
              )}
            </button>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              setLive({ platform, url });
            }}
            className="mt-6 grid gap-4"
          >
            <label className="grid gap-1 text-sm">
              <span className="font-bold">Plataforma</span>
              <select
                value={platform}
                onChange={(e) => setPlatform(e.target.value as LivePlatform)}
                className="rounded-xl border border-input bg-background px-3 py-2.5"
              >
                <option value="Instagram">Instagram</option>
                <option value="YouTube">YouTube</option>
                <option value="TikTok">TikTok</option>
              </select>
            </label>

            <label className="grid gap-1 text-sm">
              <span className="font-bold">URL de la transmisión</span>
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                required
                className="rounded-xl border border-input bg-background px-3 py-2.5"
                placeholder="https://www.instagram.com/will_design2020/live"
              />
            </label>

            <button type="submit" className="btn-outline justify-center">
              <Save className="h-4 w-4" />
              Guardar datos
            </button>
          </form>

          <p className="mt-6 rounded-xl bg-muted p-3 text-xs text-muted-foreground">
            ℹ️ Este estado se guarda por navegador. Para sincronizarlo entre
            dispositivos podemos moverlo a la base de datos más adelante.
          </p>
        </div>
      </div>
    </div>
  );
}
