import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  Check,
  Coins,
  Copy,
  CreditCard,
  ExternalLink,
  Eye,
  EyeOff,
  GripVertical,
  Loader2,
  Plus,
  ShieldCheck,
  Trash2,
  Truck,
  UploadCloud,
  Wallet,
  X,
} from "lucide-react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  listAdminPaymentMethods,
  savePaymentMethod,
  togglePaymentMethod,
  reorderPaymentMethods,
  deletePaymentMethod,
  type AdminPaymentMethod,
  type PaymentMethodType,
} from "@/lib/payment-methods.functions";
import {
  PAYMENT_TYPE_OPTIONS,
  isRedirectFlow,
  paymentTypeLabel,
  usesQr,
} from "@/lib/payment-types";
import {
  getCryptoExplorerUrl,
  getWompiWebhookUrl,
  isValidHttpsUrl,
  PAYMENT_CATEGORIES,
  paymentCategoryForType,
  paymentCategoryLabel,
  type CryptoNetwork,
} from "@/lib/payment-config";

export const Route = createFileRoute("/panel/pagos")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Métodos de pago · Will Design 3D" },
      { name: "description", content: "Configuración de métodos de pago del checkout." },
      { name: "robots", content: "noindex, nofollow" },
      { property: "og:title", content: "Métodos de pago · Will Design 3D" },
      { property: "og:description", content: "Configuración privada de métodos de pago." },
    ],
  }),
  component: PagosPage,
});

type CredRow = { key: string; value: string };

type FormState = {
  id?: string;
  name: string;
  type: PaymentMethodType;
  instructions: string;
  qr_image_url: string;
  payment_url: string;
  allowed_zones: string;
  is_wompi: boolean;
  wompi_public_key: string;
  wompi_env: "sandbox" | "production";
  wompi_events_secret: string;
  wompi_integrity_secret: string;
  bank_name: string;
  account_number: string;
  account_holder: string;
  require_proof: boolean;
  wallet_address: string;
  crypto_network: CryptoNetwork;
  display_order: number;
  is_active: boolean;
  credentials: CredRow[];
};

const emptyForm: FormState = {
  name: "",
  type: "manual_transfer",
  instructions: "",
  qr_image_url: "",
  payment_url: "",
  allowed_zones: "",
  is_wompi: false,
  wompi_public_key: "",
  wompi_env: "production",
  wompi_events_secret: "",
  wompi_integrity_secret: "",
  bank_name: "",
  account_number: "",
  account_holder: "",
  require_proof: true,
  wallet_address: "",
  crypto_network: "TRC20",
  display_order: 0,
  is_active: false,
  credentials: [],
};

const QR_BUCKET = "site-media";

async function uploadQrImage(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) throw new Error("El archivo debe ser una imagen");
  if (file.size > 5 * 1024 * 1024) throw new Error("La imagen pesa más de 5 MB");
  const path = `qr/${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
  const up = await supabase.storage.from(QR_BUCKET).upload(path, file, {
    cacheControl: "3600",
    upsert: false,
    contentType: file.type || undefined,
  });
  if (up.error) throw up.error;
  const signed = await supabase.storage
    .from(QR_BUCKET)
    .createSignedUrl(path, 60 * 60 * 24 * 365 * 10);
  if (signed.error) throw signed.error;
  return signed.data.signedUrl;
}

function categoryIcon(type: PaymentMethodType) {
  const cat = paymentCategoryForType(type);
  switch (cat) {
    case "automatic":
      return <CreditCard className="h-4 w-4 text-[var(--brand-orange)]" />;
    case "crypto":
      return <Coins className="h-4 w-4 text-[var(--brand-teal-deep)]" />;
    case "cash":
      return <Truck className="h-4 w-4 text-[var(--brand-wine)]" />;
    default:
      return <Wallet className="h-4 w-4 text-primary" />;
  }
}

function SortablePaymentRow({
  m,
  onToggle,
  onEdit,
  onDelete,
}: {
  m: AdminPaymentMethod;
  onToggle: (m: AdminPaymentMethod, v: boolean) => void;
  onEdit: (m: AdminPaymentMethod) => void;
  onDelete: (m: AdminPaymentMethod) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: m.id,
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-background p-3.5 shadow-2xs"
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        aria-label={`Arrastrar ${m.name}`}
        className="cursor-grab touch-none rounded-xl p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground active:cursor-grabbing"
      >
        <GripVertical className="h-4 w-4" />
      </button>

      <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-muted">
        {categoryIcon(m.type)}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-bold">{m.name}</p>
          <Badge variant="outline" className="text-[10px]">
            {paymentCategoryLabel(m.type)}
          </Badge>
          {m.config?.is_wompi && (
            <Badge variant="secondary" className="text-[10px]">
              Wompi {m.config.wompi_env === "sandbox" ? "Sandbox" : "Producción"}
            </Badge>
          )}
        </div>
        <p className="truncate text-xs text-muted-foreground">
          {paymentTypeLabel(m.type)}
          {m.config?.account_number ? ` · Cuenta: ${m.config.account_number}` : ""}
          {m.config?.wallet_address
            ? ` · ${m.config.crypto_network ?? "TRC20"}: ${m.config.wallet_address.slice(0, 12)}…`
            : ""}
          {m.config?.allowed_zones ? ` · ${m.config.allowed_zones}` : ""}
          {!m.config?.account_number && !m.config?.wallet_address && !m.config?.allowed_zones && m.instructions
            ? ` · ${m.instructions}`
            : ""}
        </p>
      </div>

      {m.qr_image_url && <Badge variant="secondary">Con QR</Badge>}
      {m.config?.require_proof && m.type === "manual_transfer" && (
        <Badge variant="secondary">Exige comprobante</Badge>
      )}
      {m.has_credentials ? (
        <Badge variant="secondary" className="gap-1">
          <ShieldCheck className="h-3 w-3" /> Credenciales guardadas
        </Badge>
      ) : (
        <Badge variant="outline">Sin credenciales</Badge>
      )}

      <Switch
        checked={m.is_active}
        onCheckedChange={(v) => onToggle(m, v)}
        aria-label={`Activar ${m.name}`}
      />
      <Button type="button" variant="outline" size="sm" onClick={() => onEdit(m)}>
        Editar
      </Button>
      <Button
        type="button"
        variant="outline"
        size="icon"
        aria-label={`Eliminar ${m.name}`}
        onClick={() => onDelete(m)}
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}

function PagosPage() {
  const { isSuperAdmin, loading: authLoading } = useAuth();
  const queryClient = useQueryClient();
  const load = useServerFn(listAdminPaymentMethods);
  const save = useServerFn(savePaymentMethod);
  const toggle = useServerFn(togglePaymentMethod);
  const reorder = useServerFn(reorderPaymentMethods);
  const remove = useServerFn(deletePaymentMethod);

  function invalidatePaymentCaches() {
    void queryClient.invalidateQueries({ queryKey: ["public_payment_methods"] });
    void queryClient.invalidateQueries({ queryKey: ["cart_payment_rules"] });
  }

  const [rows, setRows] = useState<AdminPaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<FormState | null>(null);
  const [saving, setSaving] = useState(false);
  const [showCreds, setShowCreds] = useState(false);
  const [uploadingQr, setUploadingQr] = useState(false);
  const [copiedWebhook, setCopiedWebhook] = useState(false);
  const qrInputRef = useRef<HTMLInputElement>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const webhookUrl = getWompiWebhookUrl(
    typeof window !== "undefined" ? window.location.origin : undefined,
  );

  async function handleQrUpload(file: File) {
    if (!form) return;
    setUploadingQr(true);
    try {
      const url = await uploadQrImage(file);
      setForm({ ...form, qr_image_url: url });
      toast.success("Imagen del QR subida");
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setUploadingQr(false);
    }
  }

  const refresh = useCallback(async () => {
    try {
      const data = await load({});
      setRows(data);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [load]);

  useEffect(() => {
    if (isSuperAdmin) void refresh();
    else if (!authLoading) setLoading(false);
  }, [isSuperAdmin, authLoading, refresh]);

  if (authLoading || loading) {
    return <p className="text-sm text-muted-foreground">Cargando métodos de pago…</p>;
  }

  if (!isSuperAdmin) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Acceso restringido</CardTitle>
          <CardDescription>Solo un Super Admin puede configurar los métodos de pago.</CardDescription>
        </CardHeader>
        <CardContent>
          <Link to="/panel" className="text-sm font-semibold underline">
            Volver al panel
          </Link>
        </CardContent>
      </Card>
    );
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form) return;
    setSaving(true);
    try {
      const extraCreds: CredRow[] = [...form.credentials];
      if (form.is_wompi && form.wompi_events_secret.trim()) {
        extraCreds.push({ key: "wompi_events_secret", value: form.wompi_events_secret.trim() });
      }
      if (form.is_wompi && form.wompi_integrity_secret.trim()) {
        extraCreds.push({
          key: "wompi_integrity_secret",
          value: form.wompi_integrity_secret.trim(),
        });
      }

      const category = paymentCategoryForType(form.type);
      if (category === "automatic" && !isValidHttpsUrl(form.payment_url)) {
        toast.error(
          "Ingresa una URL HTTPS válida para el link de checkout (ej: https://checkout.wompi.co/l/xxxxx).",
        );
        setSaving(false);
        return;
      }
      await save({
        data: {
          ...(form.id ? { id: form.id } : {}),
          name: form.name,
          type: form.type,
          instructions: form.instructions,
          qr_image_url: usesQr(form.type) || form.type === "crypto" ? form.qr_image_url : "",
          config: {
            ...(form.payment_url.trim() ? { payment_url: form.payment_url.trim() } : {}),
            ...(category === "cash" && form.allowed_zones.trim()
              ? { allowed_zones: form.allowed_zones.trim() }
              : {}),
            ...(category === "automatic"
              ? {
                  is_wompi: form.is_wompi,
                  wompi_env: form.wompi_env,
                  ...(form.wompi_public_key.trim()
                    ? { wompi_public_key: form.wompi_public_key.trim() }
                    : {}),
                }
              : {}),
            ...(category === "manual"
              ? {
                  ...(form.bank_name.trim() ? { bank_name: form.bank_name.trim() } : {}),
                  ...(form.account_number.trim()
                    ? { account_number: form.account_number.trim() }
                    : {}),
                  ...(form.account_holder.trim()
                    ? { account_holder: form.account_holder.trim() }
                    : {}),
                  require_proof: form.require_proof,
                }
              : {}),
            ...(category === "crypto"
              ? {
                  crypto_network: form.crypto_network,
                  ...(form.wallet_address.trim()
                    ? { wallet_address: form.wallet_address.trim() }
                    : {}),
                }
              : {}),
          },
          display_order: form.id ? form.display_order : rows.length,
          is_active: form.is_active,
          credentials: extraCreds.filter((c) => c.key.trim() && c.value.trim()),
        },
      });
      toast.success("Método de pago guardado");
      setForm(null);
      setShowCreds(false);
      invalidatePaymentCaches();
      await refresh();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function onToggle(m: AdminPaymentMethod, value: boolean) {
    setRows((r) => r.map((x) => (x.id === m.id ? { ...x, is_active: value } : x)));
    try {
      await toggle({ data: { id: m.id, is_active: value } });
      invalidatePaymentCaches();
    } catch (err) {
      setRows((r) => r.map((x) => (x.id === m.id ? { ...x, is_active: !value } : x)));
      toast.error((err as Error).message);
    }
  }

  async function onDelete(m: AdminPaymentMethod) {
    if (!confirm(`¿Eliminar el método "${m.name}"?`)) return;
    try {
      await remove({ data: { id: m.id } });
      setRows((r) => r.filter((x) => x.id !== m.id));
      invalidatePaymentCaches();
      toast.success("Método eliminado");
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = rows.findIndex((r) => r.id === active.id);
    const newIndex = rows.findIndex((r) => r.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;

    const reordered = arrayMove(rows, oldIndex, newIndex).map((item, idx) => ({
      ...item,
      display_order: idx,
    }));
    setRows(reordered);
    try {
      await reorder({ data: { ordered_ids: reordered.map((r) => r.id) } });
      invalidatePaymentCaches();
      toast.success("Orden de métodos actualizado");
    } catch (err) {
      toast.error((err as Error).message);
      await refresh();
    }
  }

  function edit(m: AdminPaymentMethod) {
    setForm({
      id: m.id,
      name: m.name,
      type: m.type,
      instructions: m.instructions,
      qr_image_url: m.qr_image_url ?? "",
      payment_url: m.config?.payment_url ?? "",
      allowed_zones: m.config?.allowed_zones ?? "",
      is_wompi: Boolean(m.config?.is_wompi),
      wompi_public_key: m.config?.wompi_public_key ?? "",
      wompi_env: m.config?.wompi_env ?? "production",
      wompi_events_secret: "",
      wompi_integrity_secret: "",
      bank_name: m.config?.bank_name ?? "",
      account_number: m.config?.account_number ?? "",
      account_holder: m.config?.account_holder ?? "",
      require_proof: m.config?.require_proof ?? true,
      wallet_address: m.config?.wallet_address ?? "",
      crypto_network: m.config?.crypto_network ?? "TRC20",
      display_order: m.display_order,
      is_active: m.is_active,
      credentials: [],
    });
    setShowCreds(false);
  }

  const activeCategory = form ? paymentCategoryForType(form.type) : null;
  const explorerUrl = form ? getCryptoExplorerUrl(form.crypto_network, form.wallet_address) : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-black tracking-tight">Métodos de pago</h1>
          <p className="text-sm text-muted-foreground">
            Configura pasarelas automáticas, transferencias manuales, criptomonedas y pago contra
            entrega. Arrastra para cambiar el orden en el carrito.
          </p>
        </div>
        <Button
          type="button"
          onClick={() => setForm({ ...emptyForm, display_order: rows.length })}
          className="rounded-full"
        >
          <Plus className="mr-2 h-4 w-4" /> Nuevo método
        </Button>
      </div>

      {/* Tarjetas de resumen por categoría */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {PAYMENT_CATEGORIES.map((cat) => {
          const count = rows.filter((r) => cat.types.includes(r.type)).length;
          return (
            <div key={cat.key} className="rounded-2xl border border-border bg-card p-3.5">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-black uppercase tracking-wider text-foreground">
                  {cat.label}
                </p>
                <Badge variant="secondary">{count}</Badge>
              </div>
              <p className="mt-1 text-[11px] text-muted-foreground">{cat.description}</p>
            </div>
          );
        })}
      </div>

      {form && (
        <Card className="rounded-3xl border-border bg-card">
          <CardHeader>
            <CardTitle>{form.id ? `Editar: ${form.name}` : "Nuevo método de pago"}</CardTitle>
            <CardDescription>
              Las llaves secretas se guardan en <code>credentials</code> en el servidor y jamás se
              exponen al navegador en texto plano. Si las dejas vacías al editar, se conservan las
              actuales.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={submit} className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Nombre visible
                </Label>
                <Input
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Wompi, Nequi, Bancolombia, USDT TRC20…"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Categoría / Tipo
                </Label>
                <Select
                  value={form.type}
                  onValueChange={(v) => setForm({ ...form, type: v as PaymentMethodType })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PAYMENT_TYPE_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                    {form.type === "gateway" && (
                      <SelectItem value="gateway">Pasarela de pago (antiguo)</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>

              {/* CAMPOS ESPECÍFICOS: PASARELAS AUTOMÁTICAS (WOMPI) */}
              {activeCategory === "automatic" && (
                <div className="md:col-span-2 space-y-4 rounded-2xl border border-border bg-muted/20 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-bold">Pasarela Automática / Wompi</p>
                      <p className="text-xs text-muted-foreground">
                        Configura Wompi para recibir confirmaciones automáticas de pago por webhook.
                      </p>
                    </div>
                    <label className="flex items-center gap-2 text-xs font-semibold">
                      <Switch
                        checked={form.is_wompi}
                        onCheckedChange={(v) => setForm({ ...form, is_wompi: v })}
                      />
                      Integración Wompi
                    </label>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-1 md:col-span-2">
                      <Label className="text-xs font-semibold uppercase text-muted-foreground">
                        URL de pago / Link de checkout *
                      </Label>
                      <Input
                        type="url"
                        required
                        pattern="https://.*"
                        value={form.payment_url}
                        onChange={(e) => setForm({ ...form, payment_url: e.target.value })}
                        placeholder="https://checkout.wompi.co/l/xxxxx"
                      />
                      <p className="text-[11px] text-muted-foreground">
                        Ingresa el link de cobro directo (ej: https://checkout.wompi.co/l/xxxxx). El
                        cliente será redirigido a este enlace para pagar.
                      </p>
                    </div>

                    {form.is_wompi && (
                      <>
                        <div className="space-y-1">
                          <Label className="text-xs font-semibold uppercase text-muted-foreground">
                            Llave Pública Wompi
                          </Label>
                          <Input
                            value={form.wompi_public_key}
                            onChange={(e) => setForm({ ...form, wompi_public_key: e.target.value })}
                            placeholder="pub_prod_... o pub_test_..."
                          />
                        </div>

                        <div className="space-y-1">
                          <Label className="text-xs font-semibold uppercase text-muted-foreground">
                            Entorno
                          </Label>
                          <Select
                            value={form.wompi_env}
                            onValueChange={(v) =>
                              setForm({ ...form, wompi_env: v as "sandbox" | "production" })
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="production">Producción</SelectItem>
                              <SelectItem value="sandbox">Sandbox (Pruebas)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-1">
                          <Label className="text-xs font-semibold uppercase text-muted-foreground">
                            Secreto de Eventos Wompi (solo escritura)
                          </Label>
                          <Input
                            type={showCreds ? "text" : "password"}
                            value={form.wompi_events_secret}
                            onChange={(e) =>
                              setForm({ ...form, wompi_events_secret: e.target.value })
                            }
                            placeholder={form.id ? "•••••• (dejar vacío para conservar)" : "prod_events_..."}
                            autoComplete="new-password"
                          />
                        </div>

                        <div className="space-y-1">
                          <Label className="text-xs font-semibold uppercase text-muted-foreground">
                            Secreto de Integridad Wompi (solo escritura)
                          </Label>
                          <Input
                            type={showCreds ? "text" : "password"}
                            value={form.wompi_integrity_secret}
                            onChange={(e) =>
                              setForm({ ...form, wompi_integrity_secret: e.target.value })
                            }
                            placeholder={form.id ? "•••••• (dejar vacío para conservar)" : "prod_integrity_..."}
                            autoComplete="new-password"
                          />
                        </div>

                        <div className="md:col-span-2 rounded-xl border border-border bg-background p-3">
                          <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                            URL de Webhook para registrar en el Dashboard de Wompi
                          </p>
                          <div className="mt-1.5 flex flex-wrap items-center gap-2">
                            <code className="flex-1 truncate rounded-lg bg-muted px-2.5 py-1.5 font-mono text-xs">
                              {webhookUrl}
                            </code>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={async () => {
                                await navigator.clipboard?.writeText(webhookUrl);
                                setCopiedWebhook(true);
                                toast.success("URL de webhook copiada");
                                setTimeout(() => setCopiedWebhook(false), 2000);
                              }}
                              className="gap-1.5"
                            >
                              {copiedWebhook ? (
                                <Check className="h-3.5 w-3.5 text-emerald-600" />
                              ) : (
                                <Copy className="h-3.5 w-3.5" />
                              )}
                              Copiar URL
                            </Button>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* CAMPOS ESPECÍFICOS: TRANSFERENCIAS MANUALES */}
              {activeCategory === "manual" && (
                <div className="md:col-span-2 grid gap-4 rounded-2xl border border-border bg-muted/20 p-4 md:grid-cols-3">
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold uppercase text-muted-foreground">
                      Banco / Billetera
                    </Label>
                    <Input
                      value={form.bank_name}
                      onChange={(e) => setForm({ ...form, bank_name: e.target.value })}
                      placeholder="Nequi / Bancolombia / Daviplata"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold uppercase text-muted-foreground">
                      Número de cuenta o celular
                    </Label>
                    <Input
                      value={form.account_number}
                      onChange={(e) => setForm({ ...form, account_number: e.target.value })}
                      placeholder="300 000 0000 / 123-456789-00"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold uppercase text-muted-foreground">
                      Titular
                    </Label>
                    <Input
                      value={form.account_holder}
                      onChange={(e) => setForm({ ...form, account_holder: e.target.value })}
                      placeholder="Will Design 3D SAS"
                    />
                  </div>
                  <label className="md:col-span-3 flex items-center justify-between gap-3 rounded-xl border border-border bg-background p-3">
                    <div>
                      <p className="text-sm font-bold">Exigir comprobante de pago</p>
                      <p className="text-xs text-muted-foreground">
                        Solicita al cliente subir/reportar la referencia en el enlace de seguimiento.
                      </p>
                    </div>
                    <Switch
                      checked={form.require_proof}
                      onCheckedChange={(v) => setForm({ ...form, require_proof: v })}
                    />
                  </label>
                </div>
              )}

              {/* CAMPOS ESPECÍFICOS: CRIPTO */}
              {activeCategory === "crypto" && (
                <div className="md:col-span-2 grid gap-4 rounded-2xl border border-border bg-muted/20 p-4 md:grid-cols-2">
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold uppercase text-muted-foreground">
                      Red Blockchain
                    </Label>
                    <Select
                      value={form.crypto_network}
                      onValueChange={(v) => setForm({ ...form, crypto_network: v as CryptoNetwork })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="TRC20">USDT (TRC20 — Tron)</SelectItem>
                        <SelectItem value="BEP20">USDT (BEP20 — BNB Smart Chain)</SelectItem>
                        <SelectItem value="Polygon">USDT (Polygon)</SelectItem>
                        <SelectItem value="ERC20">USDT (ERC20 — Ethereum)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold uppercase text-muted-foreground">
                      Dirección de Billetera (Wallet)
                    </Label>
                    <Input
                      value={form.wallet_address}
                      onChange={(e) => setForm({ ...form, wallet_address: e.target.value })}
                      placeholder="TQn9Y2khEsLJW1ChVWFMSMeRDow5KcbLSE"
                    />
                    {explorerUrl && (
                      <a
                        href={explorerUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-[var(--brand-teal-deep)] hover:underline"
                      >
                        Verificar wallet en explorador ({form.crypto_network})
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                  <div className="md:col-span-2 space-y-1">
                    <Label className="text-xs font-semibold uppercase text-muted-foreground">
                      Enlace de pago externo (opcional, si usas Binance Pay / Coinbase Commerce)
                    </Label>
                    <Input
                      type="url"
                      value={form.payment_url}
                      onChange={(e) => setForm({ ...form, payment_url: e.target.value })}
                      placeholder="https://..."
                    />
                  </div>
                </div>
              )}

              {/* CAMPOS ESPECÍFICOS: CONTRA ENTREGA / TALLER */}
              {activeCategory === "cash" && (
                <div className="md:col-span-2 space-y-1">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Zonas permitidas / Dirección de taller
                  </Label>
                  <Input
                    value={form.allowed_zones}
                    onChange={(e) => setForm({ ...form, allowed_zones: e.target.value })}
                    placeholder="Ej: Solo Bogotá y Soacha / Recoger en taller Chapinero"
                  />
                </div>
              )}

              <div className="md:col-span-2 space-y-1">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Instrucciones para el cliente {!usesQr(form.type) && "(opcional)"}
                </Label>
                <Textarea
                  rows={3}
                  value={form.instructions}
                  onChange={(e) => setForm({ ...form, instructions: e.target.value })}
                  placeholder="Transfiere a Nequi 300 000 0000 a nombre de Will Design 3D y envíanos el comprobante."
                />
              </div>

              {(usesQr(form.type) || activeCategory === "crypto") && (
                <div className="md:col-span-2">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Código QR (opcional)
                  </p>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <Input
                      value={form.qr_image_url}
                      onChange={(e) => setForm({ ...form, qr_image_url: e.target.value })}
                      placeholder="Pega una URL pública de la imagen del QR…"
                      className="min-w-[240px] flex-1"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      disabled={uploadingQr}
                      onClick={() => qrInputRef.current?.click()}
                    >
                      {uploadingQr ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <UploadCloud className="mr-2 h-4 w-4" />
                      )}
                      Subir imagen
                    </Button>
                    {form.qr_image_url && (
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        aria-label="Quitar QR"
                        onClick={() => setForm({ ...form, qr_image_url: "" })}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  {form.qr_image_url && (
                    <img
                      src={form.qr_image_url}
                      alt="Vista previa del código QR"
                      className="mt-2 h-32 w-32 rounded-xl border border-border object-contain shadow-sm"
                    />
                  )}
                  <input
                    ref={qrInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      e.target.value = "";
                      if (f) void handleQrUpload(f);
                    }}
                  />
                </div>
              )}

              <div className="md:col-span-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Credenciales privadas adicionales (opcional)
                  </p>
                  <button
                    type="button"
                    onClick={() => setShowCreds((s) => !s)}
                    className="flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:underline"
                  >
                    {showCreds ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                    {showCreds ? "Ocultar" : "Mostrar"}
                  </button>
                </div>
                <div className="mt-2 space-y-2">
                  {form.credentials.map((c, i) => (
                    <div key={i} className="flex gap-2">
                      <Input
                        value={c.key}
                        onChange={(e) => {
                          const next = [...form.credentials];
                          next[i] = { ...c, key: e.target.value };
                          setForm({ ...form, credentials: next });
                        }}
                        placeholder="api_key / merchant_id"
                        className="w-44"
                      />
                      <Input
                        type={showCreds ? "text" : "password"}
                        value={c.value}
                        onChange={(e) => {
                          const next = [...form.credentials];
                          next[i] = { ...c, value: e.target.value };
                          setForm({ ...form, credentials: next });
                        }}
                        placeholder="valor secreto"
                        className="flex-1"
                        autoComplete="new-password"
                      />
                      <Button
                        type="button"
                        size="icon"
                        variant="outline"
                        aria-label="Quitar credencial"
                        onClick={() =>
                          setForm({
                            ...form,
                            credentials: form.credentials.filter((_, j) => j !== i),
                          })
                        }
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setForm({ ...form, credentials: [...form.credentials, { key: "", value: "" }] })
                    }
                  >
                    <Plus className="mr-2 h-4 w-4" /> Añadir credencial privada
                  </Button>
                </div>
              </div>

              <div className="flex items-center gap-3 md:col-span-2">
                <Switch
                  checked={form.is_active}
                  onCheckedChange={(v) => setForm({ ...form, is_active: v })}
                  aria-label="Visible en el carrito"
                />
                <span className="text-sm font-semibold">Visible y activo en el carrito</span>
              </div>

              <div className="md:col-span-2 flex gap-2">
                <Button type="submit" disabled={saving}>
                  {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Guardar método
                </Button>
                <Button type="button" variant="outline" onClick={() => setForm(null)}>
                  Cancelar
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card className="rounded-3xl border-border bg-card">
        <CardHeader>
          <CardTitle>Métodos configurados ({rows.length})</CardTitle>
          <CardDescription>
            Arrastra desde el ícono izquierdo para definir el orden en que aparecen en el carrito.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Aún no hay métodos de pago. Crea el primero (por ejemplo Nequi o Wompi).
            </p>
          ) : (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={rows.map((r) => r.id)} strategy={verticalListSortingStrategy}>
                <div className="space-y-2.5">
                  {rows.map((m) => (
                    <SortablePaymentRow
                      key={m.id}
                      m={m}
                      onToggle={onToggle}
                      onEdit={edit}
                      onDelete={onDelete}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
