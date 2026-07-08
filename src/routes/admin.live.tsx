import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Radio, Save, Power, PowerOff } from "lucide-react";
import { setLive, useLive, type LivePlatform } from "@/lib/live-store";

const ADMIN_PIN_KEY = "will3d.admin_pin";
const DEFAULT_PIN = "kiara2024";

export const Route = createFileRoute("/admin/live")({
  head: () => ({
    meta: [
      { title: "Admin — Transmisión en vivo · Will Design 3D" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminLive,
});

function AdminLive() {
  const [authed, setAuthed] = useState(false);
  const [pin, setPin] = useState("");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = window.localStorage.getItem(ADMIN_PIN_KEY);
    if (saved === DEFAULT_PIN) setAuthed(true);
  }, []);

  if (!authed) {
    return (
      <div className="grid min-h-screen place-items-center bg-background p-4">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (pin === DEFAULT_PIN) {
              window.localStorage.setItem(ADMIN_PIN_KEY, pin);
              setAuthed(true);
            } else {
              alert("PIN incorrecto");
            }
          }}
          className="w-full max-w-sm rounded-3xl border border-border bg-card p-6 shadow-xl"
        >
          <h1 className="text-lg font-black">Panel de administración</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Ingresa el PIN para gestionar el estado "En Vivo".
          </p>
          <input
            type="password"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            className="mt-4 w-full rounded-xl border border-input bg-background px-3 py-2 outline-none focus:ring-2 focus:ring-ring"
            placeholder="PIN"
            autoFocus
          />
          <button type="submit" className="btn-primary mt-4 w-full justify-center">
            Entrar
          </button>
          <p className="mt-3 text-[11px] text-muted-foreground">
            PIN por defecto:{" "}
            <code className="rounded bg-muted px-1">{DEFAULT_PIN}</code> —
            cámbialo en <code>src/routes/admin.live.tsx</code>.
          </p>
        </form>
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
            ℹ️ Este estado se guarda en tu navegador. Para que aparezca en vivo
            para todos los visitantes desde cualquier dispositivo, activa
            Lovable Cloud y podemos moverlo a la base de datos.
          </p>
        </div>
      </div>
    </div>
  );
}
