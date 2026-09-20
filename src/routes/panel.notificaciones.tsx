import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { BellRing, Clock, Loader2, RefreshCw, Save } from "lucide-react";

export const Route = createFileRoute("/panel/notificaciones")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Notificaciones y horarios · Panel Will Design 3D" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: NotificationsPage,
});

const STATES = ["pendiente", "empacando", "enviado", "entregado", "cancelado"] as const;
const PAYMENT_EVENTS = [
  { key: "comprobante_enviado", label: "Comprobante enviado por el cliente" },
  { key: "pago_confirmado", label: "Pago confirmado" },
  { key: "pago_rechazado", label: "Pago rechazado" },
] as const;
const DAYS = [
  { n: 1, label: "Lun" },
  { n: 2, label: "Mar" },
  { n: 3, label: "Mié" },
  { n: 4, label: "Jue" },
  { n: 5, label: "Vie" },
  { n: 6, label: "Sáb" },
  { n: 0, label: "Dom" },
];

type Settings = {
  id: string;
  is_enabled: boolean;
  working_days: number[];
  work_start_hour: number;
  work_end_hour: number;
  whatsapp_api_url: string;
  events: Record<string, boolean>;
  templates: Record<string, string>;
};

type QueueRow = {
  id: string;
  customer_phone: string | null;
  message: string;
  event: string;
  status: string;
  scheduled_for: string;
  sent_at: string | null;
  error: string | null;
};

function NotificationsPage() {
  const [cfg, setCfg] = useState<Settings | null>(null);
  const [queue, setQueue] = useState<QueueRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const [{ data: s }, { data: q }] = await Promise.all([
      supabase
        .from("notification_settings")
        .select("*")
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("notifications_queue")
        .select("id, customer_phone, message, event, status, scheduled_for, sent_at, error")
        .order("scheduled_for", { ascending: false })
        .limit(40),
    ]);

    if (s) {
      setCfg({
        id: s.id,
        is_enabled: s.is_enabled,
        working_days: (s.working_days as number[]) ?? [1, 2, 3, 4, 5],
        work_start_hour: s.work_start_hour,
        work_end_hour: s.work_end_hour,
        whatsapp_api_url: s.whatsapp_api_url ?? "",
        events: (s.events as Record<string, boolean>) ?? {},
        templates: (s.templates as Record<string, string>) ?? {},
      });
    }
    setQueue((q as QueueRow[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function save() {
    if (!cfg) return;
    setSaving(true);
    setMsg(null);
    const { error } = await supabase
      .from("notification_settings")
      .update({
        is_enabled: cfg.is_enabled,
        working_days: cfg.working_days,
        work_start_hour: cfg.work_start_hour,
        work_end_hour: cfg.work_end_hour,
        whatsapp_api_url: cfg.whatsapp_api_url.trim() || undefined,
        events: cfg.events,
        templates: cfg.templates,
      })
      .eq("id", cfg.id);
    setSaving(false);
    setMsg(error ? `Error: ${error.message}` : "Configuración guardada.");
  }

  if (loading || !cfg) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Cargando configuración…
      </div>
    );
  }

  return (
    <>
      <div>
        <h1 className="text-3xl font-black">Notificaciones y horarios</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Cuando cambias el estado de un pedido, se programa un mensaje de WhatsApp para el cliente.
          Si estás fuera del horario laboral, el mensaje espera hasta la siguiente hora hábil.
        </p>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className="rounded-3xl border border-border bg-card p-5">
          <h2 className="flex items-center gap-2 text-lg font-bold">
            <BellRing className="h-5 w-5 text-[var(--brand-orange)]" /> Estado general
          </h2>

          <label className="mt-4 flex items-center gap-3">
            <input
              type="checkbox"
              checked={cfg.is_enabled}
              onChange={(e) => setCfg({ ...cfg, is_enabled: e.target.checked })}
              className="h-5 w-5 accent-[var(--brand-orange)]"
            />
            <span className="text-sm font-semibold">Enviar avisos automáticos por WhatsApp</span>
          </label>

          <label className="mt-4 block">
            <span className="text-xs font-bold uppercase text-muted-foreground">
              URL de la API de WhatsApp (opcional)
            </span>
            <input
              value={cfg.whatsapp_api_url}
              onChange={(e) => setCfg({ ...cfg, whatsapp_api_url: e.target.value })}
              placeholder="https://graph.facebook.com/v20.0/…/messages"
              className="mt-1 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
            <span className="mt-1 block text-[11px] text-muted-foreground">
              Si la dejas vacía, los mensajes quedan en la lista de abajo para enviarlos a mano.
            </span>
          </label>

          <div className="mt-5">
            <p className="flex items-center gap-2 text-xs font-bold uppercase text-muted-foreground">
              <Clock className="h-4 w-4" /> Días laborales
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {DAYS.map((d) => {
                const on = cfg.working_days.includes(d.n);
                return (
                  <button
                    key={d.n}
                    onClick={() =>
                      setCfg({
                        ...cfg,
                        working_days: on
                          ? cfg.working_days.filter((x) => x !== d.n)
                          : [...cfg.working_days, d.n].sort(),
                      })
                    }
                    className={`rounded-full px-3 py-1.5 text-xs font-bold transition ${
                      on
                        ? "bg-[var(--brand-teal-deep)] text-white"
                        : "bg-muted text-muted-foreground hover:bg-muted/70"
                    }`}
                  >
                    {d.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-xs font-bold uppercase text-muted-foreground">
                Desde (hora)
              </span>
              <input
                type="number"
                min={0}
                max={23}
                value={cfg.work_start_hour}
                onChange={(e) => setCfg({ ...cfg, work_start_hour: Number(e.target.value) || 0 })}
                className="mt-1 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm"
              />
            </label>
            <label className="block">
              <span className="text-xs font-bold uppercase text-muted-foreground">
                Hasta (hora)
              </span>
              <input
                type="number"
                min={1}
                max={24}
                value={cfg.work_end_hour}
                onChange={(e) => setCfg({ ...cfg, work_end_hour: Number(e.target.value) || 0 })}
                className="mt-1 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm"
              />
            </label>
          </div>
        </section>

        <section className="rounded-3xl border border-border bg-card p-5">
          <h2 className="text-lg font-bold">Mensajes por estado</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Usa <code className="rounded bg-muted px-1">{"{{cliente}}"}</code> para el nombre del
            cliente y <code className="rounded bg-muted px-1">{"{{pedido}}"}</code> para la
            referencia.
          </p>

          <div className="mt-4 space-y-4">
            {STATES.map((st) => (
              <div key={st} className="rounded-2xl border border-border bg-background p-3">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={Boolean(cfg.events[st])}
                    onChange={(e) =>
                      setCfg({ ...cfg, events: { ...cfg.events, [st]: e.target.checked } })
                    }
                    className="h-4 w-4 accent-[var(--brand-orange)]"
                  />
                  <span className="text-sm font-bold capitalize">{st}</span>
                </label>
                <textarea
                  rows={2}
                  value={cfg.templates[st] ?? ""}
                  onChange={(e) =>
                    setCfg({ ...cfg, templates: { ...cfg.templates, [st]: e.target.value } })
                  }
                  className="mt-2 w-full rounded-xl border border-input bg-background px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            ))}
          </div>
        </section>
        <section className="rounded-3xl border border-border bg-card p-5">
          <h2 className="text-lg font-bold">Mensajes por estado del pago</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            En el mensaje de pago rechazado puedes usar{" "}
            <code className="rounded bg-muted px-1">{"{{nota}}"}</code> para incluir el motivo que
            escribas al rechazar el comprobante.
          </p>

          <div className="mt-4 space-y-4">
            {PAYMENT_EVENTS.map((ev) => (
              <div key={ev.key} className="rounded-2xl border border-border bg-background p-3">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={Boolean(cfg.events[ev.key])}
                    onChange={(e) =>
                      setCfg({ ...cfg, events: { ...cfg.events, [ev.key]: e.target.checked } })
                    }
                    className="h-4 w-4 accent-[var(--brand-orange)]"
                  />
                  <span className="text-sm font-bold">{ev.label}</span>
                </label>
                <textarea
                  rows={2}
                  value={cfg.templates[ev.key] ?? ""}
                  onChange={(e) =>
                    setCfg({ ...cfg, templates: { ...cfg.templates, [ev.key]: e.target.value } })
                  }
                  className="mt-2 w-full rounded-xl border border-input bg-background px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            ))}
          </div>
        </section>
      </div>

      <div className="mt-6 flex items-center gap-3">
        <button
          onClick={save}
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-full bg-[var(--brand-wine)] px-6 py-2.5 text-sm font-bold text-white disabled:opacity-60"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Guardar configuración
        </button>
        {msg && <p className="text-xs font-semibold text-muted-foreground">{msg}</p>}
      </div>

      <section className="mt-8 rounded-3xl border border-border bg-card p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">Mensajes programados</h2>
          <button
            onClick={load}
            className="inline-flex items-center gap-1 rounded-full bg-muted px-3 py-1.5 text-xs font-bold"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Actualizar
          </button>
        </div>

        {queue.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">
            Aún no hay mensajes. Cambia el estado de un pedido para ver el primero aquí.
          </p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-muted-foreground">
                <tr>
                  <th className="py-2">Estado</th>
                  <th className="py-2">Teléfono</th>
                  <th className="py-2">Mensaje</th>
                  <th className="py-2">Programado</th>
                  <th className="py-2">Envío</th>
                </tr>
              </thead>
              <tbody>
                {queue.map((r) => (
                  <tr key={r.id} className="border-t border-border align-top">
                    <td className="py-2 font-bold capitalize">{r.event}</td>
                    <td className="py-2">{r.customer_phone || "—"}</td>
                    <td className="max-w-[22rem] py-2 text-muted-foreground">{r.message}</td>
                    <td className="py-2">
                      {new Date(r.scheduled_for).toLocaleString("es-CO", {
                        dateStyle: "short",
                        timeStyle: "short",
                      })}
                    </td>
                    <td className="py-2">
                      <span
                        className={`rounded-full px-2 py-0.5 font-bold ${
                          r.status === "sent"
                            ? "bg-[color-mix(in_oklab,var(--brand-teal)_25%,transparent)]"
                            : r.status === "failed"
                              ? "bg-red-100 text-red-700"
                              : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {r.status}
                      </span>
                      {r.error && <p className="mt-1 text-[10px] text-red-600">{r.error}</p>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
