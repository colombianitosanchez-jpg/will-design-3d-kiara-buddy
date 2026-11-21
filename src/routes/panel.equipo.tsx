import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, type PanelRole } from "@/hooks/use-auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Trash2 } from "lucide-react";

export const Route = createFileRoute("/panel/equipo")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Equipo y permisos · Will Design 3D" },
      { name: "description", content: "Gestión de roles y accesos del equipo interno." },
      { name: "robots", content: "noindex, nofollow" },
      { property: "og:title", content: "Equipo y permisos · Will Design 3D" },
      { property: "og:description", content: "Gestión de roles y accesos del equipo interno." },
    ],
  }),
  component: EquipoPage,
});

type Member = {
  user_id: string;
  email: string | null;
  role: PanelRole;
  is_active: boolean;
  created_at: string | null;
};

const ROLES: { value: PanelRole; label: string }[] = [
  { value: "pending", label: "Pendiente" },
  { value: "empleado", label: "Empleado" },
  { value: "super_admin", label: "Super Admin" },
];

function EquipoPage() {
  const { isSuperAdmin, loading: authLoading, user } = useAuth();
  const [rows, setRows] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<Member | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function load() {
    const { data, error } = await supabase
      .from("user_roles")
      .select("user_id, email, role, is_active, created_at")
      .order("created_at", { ascending: true });
    if (error) toast.error(error.message);
    setRows((data as unknown as Member[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    if (isSuperAdmin) void load();
    else if (!authLoading) setLoading(false);
  }, [isSuperAdmin, authLoading]);

  if (authLoading || loading) {
    return <p className="text-sm text-muted-foreground">Cargando equipo…</p>;
  }

  if (!isSuperAdmin) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Acceso restringido</CardTitle>
          <CardDescription>Solo un Super Admin puede gestionar el equipo.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  async function updateMember(userId: string, patch: Partial<Pick<Member, "role" | "is_active">>) {
    const prev = rows;
    setRows((r) => r.map((m) => (m.user_id === userId ? { ...m, ...patch } : m)));
    const { error } = await supabase
      .from("user_roles")
      .update(patch as never)
      .eq("user_id", userId);
    if (error) {
      setRows(prev);
      toast.error("No se pudo guardar", { description: error.message });
      return;
    }
    toast.success("Permisos actualizados");
  }

  async function confirmRemoveMember() {
    if (!deleteTarget || deleteTarget.user_id === user?.id) return;
    setDeleting(true);
    const { error } = await supabase
      .from("user_roles")
      .delete()
      .eq("user_id", deleteTarget.user_id);
    setDeleting(false);
    if (error) {
      toast.error("No se pudo eliminar al usuario", { description: error.message });
      return;
    }
    setRows((r) => r.filter((m) => m.user_id !== deleteTarget.user_id));
    setDeleteTarget(null);
    toast.success("Usuario eliminado del equipo");
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black">Equipo y permisos</h1>
        <p className="text-sm text-muted-foreground">
          Asigna roles y activa el acceso al panel. Los cambios se guardan al instante.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Usuarios registrados ({rows.length})</CardTitle>
          <CardDescription>
            Los empleados solo ven Inicio, Productos, Pedidos y Base de Conocimiento.
          </CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Correo</TableHead>
                <TableHead>Rol</TableHead>
                <TableHead>Activo</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((m) => {
                const isSelf = m.user_id === user?.id;
                return (
                  <TableRow key={m.user_id}>
                    <TableCell className="font-medium">
                      {m.email ?? m.user_id.slice(0, 8)}
                      {isSelf && <span className="ml-2 text-xs text-muted-foreground">(tú)</span>}
                    </TableCell>
                    <TableCell>
                      <Select
                        value={m.role}
                        disabled={isSelf}
                        onValueChange={(v) => updateMember(m.user_id, { role: v as PanelRole })}
                      >
                        <SelectTrigger className="w-[160px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {ROLES.map((r) => (
                            <SelectItem key={r.value} value={r.value}>
                              {r.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={m.is_active}
                        disabled={isSelf}
                        onCheckedChange={(v) => updateMember(m.user_id, { is_active: v })}
                        aria-label="Activar acceso"
                      />
                    </TableCell>
                    <TableCell>
                      {m.is_active && m.role !== "pending" ? (
                        <Badge>Con acceso</Badge>
                      ) : (
                        <Badge variant="secondary">En revisión</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {!isSelf && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          aria-label={`Eliminar a ${m.email ?? m.user_id.slice(0, 8)}`}
                          title="Eliminar usuario del equipo"
                          className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                          onClick={() => setDeleteTarget(m)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
              {rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-sm text-muted-foreground">
                    Aún no hay usuarios registrados.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog
        open={Boolean(deleteTarget)}
        onOpenChange={(openNow) => {
          if (!openNow && !deleting) setDeleteTarget(null);
        }}
      >
        <DialogContent className="max-w-md rounded-3xl border-border bg-card p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-black">Eliminar usuario del equipo</DialogTitle>
            <DialogDescription>
              ¿Seguro que deseas eliminar a este usuario del equipo?
              {deleteTarget && (
                <span className="mt-2 block font-semibold text-foreground">
                  {deleteTarget.email ?? deleteTarget.user_id.slice(0, 8)}
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              disabled={deleting}
              onClick={() => setDeleteTarget(null)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={deleting}
              onClick={confirmRemoveMember}
            >
              {deleting ? "Eliminando…" : "Eliminar usuario"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
