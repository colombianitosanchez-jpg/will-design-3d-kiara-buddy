import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  BellRing,
  Bot,
  Clock,
  Eye,
  EyeOff,
  Loader2,
  MessageSquare,
  RefreshCw,
  RotateCw,
  Save,
  Send,
} from "lucide-react";
import {
  getNotificationAdminData,
  retryQueuedNotificationAdmin,
  saveNotificationSettingsAdmin,
  sendTelegramTestAdmin,
  type NotificationQueueItem,
  type NotificationSettingsDTO,
} from "@/lib/notifications.functions";
import {
  normalizeQueueStatusLabel,
  TELEGRAM_EVENT_LABELS,
} from "@/lib/notification-templates";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/panel/notificaciones")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Notificaciones y alertas · Panel Will Design 3D" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: NotificationsPage,
});

const ORDER_STATES = [
  { key: "pendiente", label: "Pendiente" },
  { key: "empacando", label: "Empacando / Imprimiendo" },
  { key: "enviado", label: "Enviado" },
  { key: "entregado", label: "Entregado" },
  { key: "cancelado", label: "Cancelado" },
] as const;

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

const TEMPLATE_TOKENS = [
  "{{nombre}}",
  "{{pedido}}",
  "{{estado}}",
  "{{total}}",
  "{{guia}}",
  "{{nota}}",
];

function NotificationsPage() {
  const loadDataFn = useServerFn(getNotificationAdminData);
  const saveFn = useServerFn(saveNotificationSettingsAdmin);
  const testTgFn = useServerFn(sendTelegramTestAdmin);
  const retryFn = useServerFn(retryQueuedNotificationAdmin);

  const [cfg, setCfg] = useState<NotificationSettingsDTO | null>(null);
  const [queue, setQueue] = useState<NotificationQueueItem[]>([]);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testingTg, setTestingTg] = useState(false);
  const [retryingId, setRetryingId] = useState<string | null>(null);
  const [showBotToken, setShowBotToken] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await loadDataFn({});
      setCfg(res.settings);
      setQueue(res.queue);
      setIsSuperAdmin(res.isSuperAdmin);
    } catch (err) {
      toast.error((err as Error).message || "No se pudo cargar la configuración");
    } finally {
      setLoading(false);
    }
  }, [loadDataFn]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleSave() {
    if (!cfg) return;
    setSaving(true);
    try {
      await saveFn({
        data: {
          id: cfg.id,
          is_enabled: cfg.is_enabled,
          working_days: cfg.working_days,
          work_start_hour: cfg.work_start_hour,
          work_end_hour: cfg.work_end_hour,
          whatsapp_api_url: cfg.whatsapp_api_url,
          events: cfg.events,
          templates: cfg.templates,
          telegram_bot_token: cfg.telegram_bot_token,
          telegram_chat_id: cfg.telegram_chat_id,
        },
      });
      toast.success("Configuración de alertas y notificaciones guardada");
    } catch (err) {
      toast.error((err as Error).message || "No se pudo guardar");
    } finally {
      setSaving(false);
    }
  }

  async function handleTelegramTest() {
    if (!cfg) return;
    setTestingTg(true);
    try {
      await testTgFn({
        data: {
          telegram_bot_token: cfg.telegram_bot_token,
          telegram_chat_id: cfg.telegram_chat_id,
        },
      });
      toast.success("¡Mensaje de prueba enviado a Telegram! Revisa tu chat.");
    } catch (err) {
      toast.error((err as Error).message || "Error al conectar con Telegram");
    } finally {
      setTestingTg(false);
    }
  }

  async function handleRetry(id: string) {
    setRetryingId(id);
    try {
      const res = await retryFn({ data: { id } });
      if (res.ok) {
        toast.success("Mensaje reenviado correctamente por WhatsApp API");
      } else {
        toast.error(res.error || "No se pudo enviar el mensaje");
      }
      await load();
    } catch (err) {
      toast.error((err as Error).message || "Error al reintentar");
    } finally {
      setRetryingId(null);
    }
  }

  if (loading || !cfg) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Cargando notificaciones y alertas…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight">Notificaciones en Tiempo Real</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Configura las alertas instantáneas por Telegram para el equipo y los avisos automáticos por
            WhatsApp para tus clientes.
          </p>
        </div>
        {isSuperAdmin && (
          <Button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="gap-2 rounded-full bg-[var(--brand-wine)] px-6 text-white hover:brightness-95"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Guardar configuración
          </Button>
        )}
      </div>

      {/* BLOQUE 1: ALERTAS AL DESARROLLADOR / DUEÑO (TELEGRAM) */}
      <Card className="rounded-3xl border-border bg-card">
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2 text-xl font-black">
                <Bot className="h-5 w-5 text-[var(--brand-teal-deep)]" />
                Alertas al Desarrollador / Dueño (Telegram)
              </CardTitle>
              <CardDescription className="mt-1">
                Recibe alertas inmediatas en tu celular ante pedidos nuevos, comprobantes subidos, pagos
                confirmados por Wompi y cambios de estado.
              </CardDescription>
            </div>
            <Badge variant={cfg.telegram_bot_token && cfg.telegram_chat_id ? "default" : "outline"}>
              {cfg.telegram_bot_token && cfg.telegram_chat_id ? "Configurado" : "Pendiente"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {isSuperAdmin ? (
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="tg-bot-token" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Telegram Bot Token
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="tg-bot-token"
                    type={showBotToken ? "text" : "password"}
                    value={cfg.telegram_bot_token}
                    onChange={(e) => setCfg({ ...cfg, telegram_bot_token: e.target.value })}
                    placeholder="1234567890:ABCdef..."
                    autoComplete="off"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => setShowBotToken((s) => !s)}
                    aria-label={showBotToken ? "Ocultar token" : "Mostrar token"}
                  >
                    {showBotToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="tg-chat-id" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Telegram Chat ID
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="tg-chat-id"
                    value={cfg.telegram_chat_id}
                    onChange={(e) => setCfg({ ...cfg, telegram_chat_id: e.target.value })}
                    placeholder="-1001234567890 o 987654321"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    disabled={testingTg}
                    onClick={handleTelegramTest}
                    className="shrink-0 gap-1.5"
                  >
                    {testingTg ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                    🧪 Enviar prueba
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <p className="rounded-2xl border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
              Solo un Super Admin puede visualizar o modificar las credenciales privadas del Bot de
              Telegram.
            </p>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            {TELEGRAM_EVENT_LABELS.map((item) => (
              <label
                key={item.key}
                className="flex items-start justify-between gap-3 rounded-2xl border border-border bg-background p-3.5"
              >
                <div className="space-y-0.5">
                  <span className="text-sm font-bold">{item.label}</span>
                  <p className="text-xs text-muted-foreground">{item.description}</p>
                </div>
                <Switch
                  disabled={!isSuperAdmin}
                  checked={cfg.events[item.key] !== false}
                  onCheckedChange={(checked) =>
                    setCfg({ ...cfg, events: { ...cfg.events, [item.key]: checked } })
                  }
                  aria-label={item.label}
                />
              </label>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* BLOQUE 2: NOTIFICACIONES AL CLIENTE (WHATSAPP) */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="rounded-3xl border-border bg-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg font-black">
              <BellRing className="h-5 w-5 text-[var(--brand-orange)]" />
              Notificaciones al Cliente (WhatsApp)
            </CardTitle>
            <CardDescription>
              Envía mensajes automáticos vía API o déjalos listos para envío manual desde el panel.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <label className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-background p-3.5">
              <div>
                <p className="text-sm font-bold">Activar notificaciones a clientes</p>
                <p className="text-xs text-muted-foreground">
                  Encola y programa mensajes cuando cambia el estado del pedido o pago.
                </p>
              </div>
              <Switch
                disabled={!isSuperAdmin}
                checked={cfg.is_enabled}
                onCheckedChange={(v) => setCfg({ ...cfg, is_enabled: v })}
                aria-label="Activar notificaciones a clientes"
              />
            </label>

            <div className="space-y-1.5">
              <Label htmlFor="wa-api-url" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                URL de la API de WhatsApp (opcional)
              </Label>
              <Input
                id="wa-api-url"
                disabled={!isSuperAdmin}
                value={cfg.whatsapp_api_url}
                onChange={(e) => setCfg({ ...cfg, whatsapp_api_url: e.target.value })}
                placeholder="https://graph.facebook.com/v20.0/…/messages o Evolution API"
              />
              <p className="text-[11px] text-muted-foreground">
                Si la dejas vacía, los mensajes quedan registrados para envío rápido en 1 clic desde{" "}
                <strong>Panel → Pedidos</strong>.
              </p>
            </div>

            <div className="space-y-2">
              <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                <Clock className="h-4 w-4" /> Horarios comerciales ({cfg.timezone})
              </p>
              <div className="flex flex-wrap gap-2">
                {DAYS.map((d) => {
                  const on = cfg.working_days.includes(d.n);
                  return (
                    <button
                      key={d.n}
                      type="button"
                      disabled={!isSuperAdmin}
                      onClick={() =>
                        setCfg({
                          ...cfg,
                          working_days: on
                            ? cfg.working_days.filter((x) => x !== d.n)
                            : [...cfg.working_days, d.n].sort(),
                        })
                      }
                      className={`cursor-pointer rounded-full px-3 py-1.5 text-xs font-bold transition ${
                        on
                          ? "bg-[var(--brand-teal-deep)] text-white"
                          : "bg-muted text-muted-foreground hover:bg-muted/80"
                      }`}
                    >
                      {d.label}
                    </button>
                  );
                })}
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="space-y-1">
                  <Label htmlFor="work-start" className="text-xs font-bold uppercase text-muted-foreground">
                    Desde (hora)
                  </Label>
                  <Input
                    id="work-start"
                    type="number"
                    min={0}
                    max={23}
                    disabled={!isSuperAdmin}
                    value={cfg.work_start_hour}
                    onChange={(e) => setCfg({ ...cfg, work_start_hour: Number(e.target.value) || 0 })}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="work-end" className="text-xs font-bold uppercase text-muted-foreground">
                    Hasta (hora)
                  </Label>
                  <Input
                    id="work-end"
                    type="number"
                    min={1}
                    max={24}
                    disabled={!isSuperAdmin}
                    value={cfg.work_end_hour}
                    onChange={(e) => setCfg({ ...cfg, work_end_hour: Number(e.target.value) || 18 })}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-3xl border-border bg-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg font-black">
              <MessageSquare className="h-5 w-5 text-[var(--brand-wine)]" />
              Editor de Plantillas
            </CardTitle>
            <CardDescription>
              Variables compatibles:{" "}
              <span className="inline-flex flex-wrap gap-1 pt-1">
                {TEMPLATE_TOKENS.map((t) => (
                  <code key={t} className="rounded bg-muted px-1.5 py-0.5 text-[11px] font-semibold">
                    {t}
                  </code>
                ))}
              </span>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="orders" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="orders">Estados del Pedido</TabsTrigger>
                <TabsTrigger value="payments">Estados del Pago</TabsTrigger>
              </TabsList>

              <TabsContent value="orders" className="mt-4 space-y-3">
                {ORDER_STATES.map((st) => (
                  <div key={st.key} className="rounded-2xl border border-border bg-background p-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-bold">{st.label}</span>
                      <Switch
                        disabled={!isSuperAdmin}
                        checked={Boolean(cfg.events[st.key])}
                        onCheckedChange={(checked) =>
                          setCfg({ ...cfg, events: { ...cfg.events, [st.key]: checked } })
                        }
                        aria-label={`Activar aviso para ${st.label}`}
                      />
                    </div>
                    <Textarea
                      rows={2}
                      disabled={!isSuperAdmin}
                      value={cfg.templates[st.key] ?? ""}
                      onChange={(e) =>
                        setCfg({
                          ...cfg,
                          templates: { ...cfg.templates, [st.key]: e.target.value },
                        })
                      }
                      className="mt-2 text-xs"
                    />
                  </div>
                ))}
              </TabsContent>

              <TabsContent value="payments" className="mt-4 space-y-3">
                {PAYMENT_EVENTS.map((ev) => (
                  <div key={ev.key} className="rounded-2xl border border-border bg-background p-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-bold">{ev.label}</span>
                      <Switch
                        disabled={!isSuperAdmin}
                        checked={Boolean(cfg.events[ev.key])}
                        onCheckedChange={(checked) =>
                          setCfg({ ...cfg, events: { ...cfg.events, [ev.key]: checked } })
                        }
                        aria-label={`Activar aviso para ${ev.label}`}
                      />
                    </div>
                    <Textarea
                      rows={2}
                      disabled={!isSuperAdmin}
                      value={cfg.templates[ev.key] ?? ""}
                      onChange={(e) =>
                        setCfg({
                          ...cfg,
                          templates: { ...cfg.templates, [ev.key]: e.target.value },
                        })
                      }
                      className="mt-2 text-xs"
                    />
                  </div>
                ))}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      {/* BLOQUE 3: HISTORIAL Y COLA DE MENSAJES */}
      <Card className="rounded-3xl border-border bg-card">
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle className="text-lg font-black">Historial y Cola de Mensajes</CardTitle>
            <CardDescription>
              Últimos mensajes programados o despachados en <code>notifications_queue</code>.
            </CardDescription>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={() => void load()} className="gap-1.5 rounded-full">
            <RefreshCw className="h-3.5 w-3.5" /> Actualizar
          </Button>
        </CardHeader>
        <CardContent>
          {queue.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Aún no hay mensajes registrados. Cambia el estado de un pedido para ver el primero aquí.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="text-muted-foreground">
                  <tr className="border-b border-border">
                    <th className="py-2.5 pr-3">Evento</th>
                    <th className="py-2.5 pr-3">Teléfono</th>
                    <th className="py-2.5 pr-3">Mensaje</th>
                    <th className="py-2.5 pr-3">Programado</th>
                    <th className="py-2.5 pr-3">Estado</th>
                    <th className="py-2.5 text-right">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {queue.map((r) => {
                    const badge = normalizeQueueStatusLabel(r.status);
                    const badgeClass =
                      badge.tone === "sent"
                        ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                        : badge.tone === "failed"
                          ? "bg-destructive/15 text-destructive"
                          : badge.tone === "manual"
                            ? "bg-amber-500/15 text-amber-700 dark:text-amber-300"
                            : "bg-muted text-muted-foreground";
                    return (
                      <tr key={r.id} className="align-top">
                        <td className="py-3 pr-3 font-bold capitalize">{r.event.replaceAll("_", " ")}</td>
                        <td className="py-3 pr-3 whitespace-nowrap">{r.customer_phone || "—"}</td>
                        <td className="max-w-[24rem] py-3 pr-3 text-muted-foreground">{r.message}</td>
                        <td className="py-3 pr-3 whitespace-nowrap">
                          {new Date(r.scheduled_for).toLocaleString("es-CO", {
                            dateStyle: "short",
                            timeStyle: "short",
                          })}
                        </td>
                        <td className="py-3 pr-3">
                          <span className={`inline-flex rounded-full px-2.5 py-0.5 font-bold ${badgeClass}`}>
                            {badge.label}
                          </span>
                          {r.error && <p className="mt-1 text-[11px] text-destructive">{r.error}</p>}
                        </td>
                        <td className="py-3 text-right">
                          {r.status !== "sent" && (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              disabled={retryingId === r.id}
                              onClick={() => handleRetry(r.id)}
                              className="h-7 gap-1 rounded-full text-[11px]"
                            >
                              {retryingId === r.id ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <RotateCw className="h-3 w-3" />
                              )}
                              Reintentar
                            </Button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
