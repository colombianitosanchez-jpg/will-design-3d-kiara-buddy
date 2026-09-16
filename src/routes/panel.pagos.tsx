import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Eye, EyeOff, Loader2, Plus, Trash2, UploadCloud, X } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  display_order: 0,
  is_active: false,
  credentials: [{ key: "numero", value: "" }],
};

const QR_BUCKET = "site-media";

/** Sube la imagen del QR al almacenamiento del sitio y devuelve una URL de larga duración. */
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

function PagosPage() {
  const { isSuperAdmin, loading: authLoading } = useAuth();
  const load = useServerFn(listAdminPaymentMethods);
  const save = useServerFn(savePaymentMethod);
  const toggle = useServerFn(togglePaymentMethod);
  const remove = useServerFn(deletePaymentMethod);

  const [rows, setRows] = useState<AdminPaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<FormState | null>(null);
  const [saving, setSaving] = useState(false);
  const [showCreds, setShowCreds] = useState(false);
  const [uploadingQr, setUploadingQr] = useState(false);
  const qrInputRef = useRef<HTMLInputElement>(null);

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
      await save({
        data: {
          ...(form.id ? { id: form.id } : {}),
          name: form.name,
          type: form.type,
          instructions: form.instructions,
          qr_image_url: usesQr(form.type) ? form.qr_image_url : "",
          config: {
            ...(isRedirectFlow(form.type) && form.payment_url.trim()
              ? { payment_url: form.payment_url.trim() }
              : {}),
            ...(form.type === "cash_on_delivery" && form.allowed_zones.trim()
              ? { allowed_zones: form.allowed_zones.trim() }
              : {}),
          },
          display_order: form.display_order,
          is_active: form.is_active,
          credentials: form.credentials.filter((c) => c.key.trim() && c.value.trim()),
        },
      });
      toast.success("Método de pago guardado");
      setForm(null);
      setShowCreds(false);
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
      toast.success("Método eliminado");
    } catch (err) {
      toast.error((err as Error).message);
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
      display_order: m.display_order,
      is_active: m.is_active,
      credentials: [{ key: isRedirectFlow(m.type) ? "api_key" : "numero", value: "" }],
    });
    setShowCreds(false);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black">Métodos de pago</h1>
          <p className="text-sm text-muted-foreground">
            Configura cómo pueden pagarte tus clientes. Solo los métodos activos aparecen en el
            carrito.
          </p>
        </div>
        <Button onClick={() => setForm({ ...emptyForm })}>
          <Plus className="mr-2 h-4 w-4" /> Nuevo método
        </Button>
      </div>

      {form && (
        <Card>
          <CardHeader>
            <CardTitle>{form.id ? "Editar método" : "Nuevo método"}</CardTitle>
            <CardDescription>
              Las credenciales se guardan cifradas en el servidor y nunca se muestran de vuelta. Si
              las dejas vacías al editar, se conservan las actuales.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={submit} className="grid gap-4 md:grid-cols-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Nombre
                <Input
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Nequi, Bancolombia, Wompi…"
                  className="mt-1"
                />
              </label>
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Tipo
                <Select
                  value={form.type}
                  onValueChange={(v) => setForm({ ...form, type: v as PaymentMethodType })}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manual_transfer">Transferencia manual</SelectItem>
                    <SelectItem value="gateway">Pasarela de pago</SelectItem>
                  </SelectContent>
                </Select>
              </label>
              <label className="md:col-span-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Instrucciones para el cliente
                <Textarea
                  rows={3}
                  value={form.instructions}
                  onChange={(e) => setForm({ ...form, instructions: e.target.value })}
                  placeholder="Transfiere a Nequi 300 000 0000 a nombre de Will Design 3D y envíanos el comprobante."
                  className="mt-1"
                />
              </label>

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
                <p className="mt-1 text-xs text-muted-foreground">
                  Sube la imagen o pega la URL (por ejemplo de Imgur). El cliente la verá en el
                  carrito al elegir este método.
                </p>
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

              <div className="md:col-span-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Credenciales privadas
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
                        placeholder="numero / api_key"
                        className="w-40"
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
                    <Plus className="mr-2 h-4 w-4" /> Añadir credencial
                  </Button>
                </div>
              </div>

              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Orden
                <Input
                  type="number"
                  min={0}
                  value={form.display_order}
                  onChange={(e) =>
                    setForm({ ...form, display_order: Number(e.target.value) || 0 })
                  }
                  className="mt-1 w-28"
                />
              </label>
              <div className="flex items-end gap-3">
                <Switch
                  checked={form.is_active}
                  onCheckedChange={(v) => setForm({ ...form, is_active: v })}
                  aria-label="Activo"
                />
                <span className="text-sm">Visible en el carrito</span>
              </div>

              <div className="md:col-span-2 flex gap-2">
                <Button type="submit" disabled={saving}>
                  {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Guardar
                </Button>
                <Button type="button" variant="outline" onClick={() => setForm(null)}>
                  Cancelar
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Métodos configurados ({rows.length})</CardTitle>
          <CardDescription>Activa o desactiva cada método en cualquier momento.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {rows.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Aún no hay métodos de pago. Crea el primero (por ejemplo Nequi).
            </p>
          )}
          {rows.map((m) => (
            <div
              key={m.id}
              className="flex flex-wrap items-center gap-3 rounded-2xl border border-border p-3"
            >
              <div className="min-w-0 flex-1">
                <p className="font-bold">{m.name}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {m.type === "gateway" ? "Pasarela" : "Transferencia manual"} ·{" "}
                  {m.instructions || "sin instrucciones"}
                </p>
              </div>
              {m.qr_image_url && <Badge variant="secondary">Con QR</Badge>}
              {m.has_credentials ? (
                <Badge variant="secondary">Credenciales guardadas</Badge>
              ) : (
                <Badge variant="outline">Sin credenciales</Badge>
              )}
              <Switch
                checked={m.is_active}
                onCheckedChange={(v) => onToggle(m, v)}
                aria-label={`Activar ${m.name}`}
              />
              <Button variant="outline" size="sm" onClick={() => edit(m)}>
                Editar
              </Button>
              <Button
                variant="outline"
                size="icon"
                aria-label={`Eliminar ${m.name}`}
                onClick={() => onDelete(m)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
