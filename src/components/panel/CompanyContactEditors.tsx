import { useId, useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
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
import {
  ArrowUpDown,
  CheckCircle2,
  ChevronDown,
  CircleDashed,
  ExternalLink,
  Eye,
  Globe,
  GripVertical,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  Plus,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  SOCIAL_PLATFORM_LABELS,
  SocialPlatformIcon,
} from "@/components/SocialPlatformIcon";
import {
  parseContactBlocksOrder,
  parseContactChannels,
  parseSocialLinks,
  serializeContactBlocksOrder,
  serializeContactChannels,
  serializeSocialLinks,
  type ContactBlockKey,
  type ContactChannel,
  type ContactChannelType,
  type ContactSocialLink,
  type SocialPlatform,
} from "@/lib/contact-config";

const BLOCK_META: Record<
  ContactBlockKey,
  { title: string; subtitle: string; icon: typeof MapPin }
> = {
  canales: {
    title: "📞 Canales Directos",
    subtitle: "Tarjetas de WhatsApp, teléfonos y correos electrónicos",
    icon: Phone,
  },
  mapa: {
    title: "📍 Mapa y Ubicación Física",
    subtitle: "Dirección del taller y mapa embebido de Google Maps",
    icon: MapPin,
  },
  redes: {
    title: "🌐 Redes Sociales",
    subtitle: "Tarjetas de Instagram, TikTok, YouTube y enlaces sociales",
    icon: Globe,
  },
  formulario: {
    title: "✉️ Formulario de Mensaje",
    subtitle: "Formulario interactivo con envío directo a WhatsApp",
    icon: Mail,
  },
};

function SortableBlockRow({
  blockKey,
  index,
}: {
  blockKey: ContactBlockKey;
  index: number;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: blockKey,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.55 : 1,
  };

  const meta = BLOCK_META[blockKey];
  const Icon = meta.icon;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 rounded-xl border border-border bg-card p-3.5 shadow-xs"
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        aria-label={`Reordenar ${meta.title}`}
        className="cursor-grab touch-none rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
      >
        <GripVertical className="h-4 w-4" />
      </button>

      <span className="w-7 text-center font-mono text-xs font-bold text-muted-foreground tabular-nums">
        #{index + 1}
      </span>

      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
        <Icon className="h-4 w-4" aria-hidden="true" />
      </span>

      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold text-foreground truncate">{meta.title}</p>
        <p className="text-xs text-muted-foreground truncate">{meta.subtitle}</p>
      </div>
    </div>
  );
}

export function ContactBlocksOrderEditor({
  rawOrder,
  onChange,
  embedded = false,
}: {
  rawOrder?: string;
  onChange: (serialized: string) => void;
  embedded?: boolean;
}) {
  const order = parseContactBlocksOrder(rawOrder);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIdx = order.indexOf(active.id as ContactBlockKey);
    const newIdx = order.indexOf(over.id as ContactBlockKey);
    if (oldIdx !== -1 && newIdx !== -1) {
      onChange(serializeContactBlocksOrder(arrayMove(order, oldIdx, newIdx)));
    }
  }

  const content = (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        El orden de estas tarjetas define el orden exacto en que se muestran en tu página pública de contacto. Arrastra y suelta para reorganizar.
      </p>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={order} strategy={verticalListSortingStrategy}>
          <div className="space-y-2.5">
            {order.map((blockKey, idx) => (
              <SortableBlockRow key={blockKey} blockKey={blockKey} index={idx} />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );

  if (embedded) return content;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Orden visual de la página /contacto</CardTitle>
        <CardDescription>
          El orden de estas tarjetas define el orden exacto en que se muestran en tu página pública de contacto. Arrastra y suelta para reorganizar.
        </CardDescription>
      </CardHeader>
      <CardContent>{content}</CardContent>
    </Card>
  );
}

function SortableChannelRow({
  channel,
  onUpdate,
  onSetPrimary,
  onDelete,
}: {
  channel: ContactChannel;
  onUpdate: (id: string, patch: Partial<ContactChannel>) => void;
  onSetPrimary: (id: string, checked: boolean) => void;
  onDelete: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: channel.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.55 : 1,
  };

  const Icon =
    channel.type === "whatsapp"
      ? MessageCircle
      : channel.type === "phone"
        ? Phone
        : Mail;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="space-y-3 rounded-xl border border-border bg-card p-4 shadow-xs"
    >
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          {...attributes}
          {...listeners}
          aria-label={`Reordenar canal ${channel.label}`}
          className="cursor-grab touch-none rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <GripVertical className="h-4 w-4" />
        </button>

        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
          <Icon className="h-4 w-4" aria-hidden="true" />
        </span>

        <div className="w-36 shrink-0">
          <Select
            value={channel.type}
            onValueChange={(val) => onUpdate(channel.id, { type: val as ContactChannelType })}
          >
            <SelectTrigger className="h-9 text-xs font-semibold">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="whatsapp">WhatsApp</SelectItem>
              <SelectItem value="phone">Teléfono</SelectItem>
              <SelectItem value="email">Correo</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="min-w-[160px] flex-1">
          <Input
            value={channel.label}
            onChange={(e) => onUpdate(channel.id, { label: e.target.value })}
            placeholder="Nombre visible (Ej: WhatsApp Ventas)"
            className="h-9 text-xs font-semibold"
          />
        </div>

        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => onDelete(channel.id)}
          aria-label={`Eliminar canal ${channel.label}`}
          className="h-9 w-9 text-muted-foreground hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 pl-0 sm:pl-10">
        <div>
          <Label className="text-xs text-muted-foreground">
            {channel.type === "email"
              ? "Correo electrónico"
              : channel.type === "whatsapp"
                ? "Número con indicativo (ej: 573156724474)"
                : "Número telefónico (ej: +576012345678)"}
          </Label>
          <Input
            value={channel.value}
            onChange={(e) => onUpdate(channel.id, { value: e.target.value })}
            placeholder={
              channel.type === "email" ? "hola@willdesign3d.com" : "573156724474"
            }
            className="mt-1 h-9 text-xs"
          />
        </div>

        <div>
          <Label className="text-xs text-muted-foreground">
            Texto visible formateado (opcional)
          </Label>
          <Input
            value={channel.displayValue ?? ""}
            onChange={(e) => onUpdate(channel.id, { displayValue: e.target.value })}
            placeholder={
              channel.type === "email" ? "hola@willdesign3d.com" : "+57 315 672 4474"
            }
            className="mt-1 h-9 text-xs"
          />
        </div>
      </div>

      {channel.type === "whatsapp" && (
        <div className="flex items-center justify-between gap-3 rounded-lg bg-muted/40 px-3 py-2 sm:ml-10">
          <Label
            htmlFor={`primary-wa-${channel.id}`}
            className="cursor-pointer text-xs font-medium text-foreground"
          >
            Usar este WhatsApp para recibir pedidos rápidos
          </Label>
          <Switch
            id={`primary-wa-${channel.id}`}
            checked={Boolean(channel.isPrimaryOrder)}
            onCheckedChange={(checked) => onSetPrimary(channel.id, checked)}
          />
        </div>
      )}
    </div>
  );
}

export function ContactChannelsEditor({
  values,
  onPatch,
  embedded = false,
}: {
  values: Record<string, string>;
  onPatch: (patch: Record<string, string>) => void;
  embedded?: boolean;
}) {
  const channels = parseContactChannels(values.contact_channels, values);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function commitChannels(next: ContactChannel[]) {
    const primaryWa =
      next.find((c) => c.type === "whatsapp" && c.isPrimaryOrder) ??
      next.find((c) => c.type === "whatsapp");
    const firstEmail = next.find((c) => c.type === "email" && c.value.trim());

    onPatch({
      contact_channels: JSON.stringify(next),
      ...(primaryWa
        ? {
            contact_whatsapp: primaryWa.value.replace(/\D/g, "") || primaryWa.value.trim(),
            contact_whatsapp_display: primaryWa.displayValue?.trim() || primaryWa.value.trim(),
          }
        : {}),
      ...(firstEmail ? { contact_email: firstEmail.value.trim() } : {}),
    });
  }

  function handleAdd() {
    const next: ContactChannel = {
      id: `ch_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      type: "whatsapp",
      label: "WhatsApp Taller",
      value: "",
      displayValue: "",
      isPrimaryOrder: channels.filter((c) => c.type === "whatsapp").length === 0,
    };
    commitChannels([...channels, next]);
  }

  function handleUpdate(id: string, patch: Partial<ContactChannel>) {
    commitChannels(
      channels.map((c) => (c.id === id ? { ...c, ...patch } : c)),
    );
  }

  function handleSetPrimary(id: string, checked: boolean) {
    commitChannels(
      channels.map((c) => {
        if (c.type !== "whatsapp") return c;
        if (c.id === id) return { ...c, isPrimaryOrder: checked };
        return checked ? { ...c, isPrimaryOrder: false } : c;
      }),
    );
  }

  function handleDelete(id: string) {
    const remaining = channels.filter((c) => c.id !== id);
    if (remaining.length === 0) {
      onPatch({
        contact_channels: "[]",
      });
      return;
    }
    const serialized = serializeContactChannels(remaining);
    onPatch({
      contact_channels: serialized,
    });
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIdx = channels.findIndex((c) => c.id === active.id);
    const newIdx = channels.findIndex((c) => c.id === over.id);
    if (oldIdx !== -1 && newIdx !== -1) {
      commitChannels(arrayMove(channels, oldIdx, newIdx));
    }
  }

  const listBody = (
    <div className="space-y-4">
      {embedded && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">
            Agrega múltiples líneas de atención (Ventas, Taller, Soporte) y elige cuál recibe los pedidos rápidos.
          </p>
          <Button type="button" size="sm" variant="outline" onClick={handleAdd}>
            <Plus className="mr-1.5 h-4 w-4" /> Agregar canal
          </Button>
        </div>
      )}

      {channels.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          No hay canales configurados. Pulsa "Agregar canal" para crear el primero.
        </div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={channels.map((c) => c.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-3">
              {channels.map((ch) => (
                <SortableChannelRow
                  key={ch.id}
                  channel={ch}
                  onUpdate={handleUpdate}
                  onSetPrimary={handleSetPrimary}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </div>
  );

  if (embedded) return listBody;

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
        <div>
          <CardTitle className="text-base">Canales Directos (WhatsApp, Teléfono y Correo)</CardTitle>
          <CardDescription>
            Agrega múltiples líneas de atención (Ventas, Taller, Soporte) y elige cuál recibe los pedidos rápidos.
          </CardDescription>
        </div>
        <Button type="button" size="sm" variant="outline" onClick={handleAdd}>
          <Plus className="mr-1.5 h-4 w-4" /> Agregar canal
        </Button>
      </CardHeader>
      <CardContent>{listBody}</CardContent>
    </Card>
  );
}

function SortableSocialRow({
  social,
  onUpdate,
  onDelete,
}: {
  social: ContactSocialLink;
  onUpdate: (id: string, patch: Partial<ContactSocialLink>) => void;
  onDelete: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: social.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.55 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="space-y-3 rounded-xl border border-border bg-card p-4 shadow-xs"
    >
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          {...attributes}
          {...listeners}
          aria-label={`Reordenar red ${social.label}`}
          className="cursor-grab touch-none rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <GripVertical className="h-4 w-4" />
        </button>

        <span
          className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-secondary/15 text-secondary"
          title={SOCIAL_PLATFORM_LABELS[social.platform]}
        >
          <SocialPlatformIcon platform={social.platform} className="h-4 w-4" />
        </span>

        <div className="w-44 shrink-0">
          <Select
            value={social.platform}
            onValueChange={(val) => onUpdate(social.id, { platform: val as SocialPlatform })}
          >
            <SelectTrigger className="h-9 text-xs font-semibold">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(SOCIAL_PLATFORM_LABELS) as SocialPlatform[]).map((p) => (
                <SelectItem key={p} value={p}>
                  {SOCIAL_PLATFORM_LABELS[p]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="min-w-[160px] flex-1">
          <Input
            value={social.label}
            onChange={(e) => onUpdate(social.id, { label: e.target.value })}
            placeholder="Texto visible (ej: @will_design2020)"
            className="h-9 text-xs font-semibold"
          />
        </div>

        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => onDelete(social.id)}
          aria-label={`Eliminar red ${social.label}`}
          className="h-9 w-9 text-muted-foreground hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      <div className="pl-0 sm:pl-10">
        <Label className="text-xs text-muted-foreground">URL completa</Label>
        <Input
          value={social.url}
          onChange={(e) => onUpdate(social.id, { url: e.target.value })}
          placeholder="https://www.instagram.com/will_design2020/"
          className="mt-1 h-9 text-xs"
        />
      </div>
    </div>
  );
}

export function ContactSocialLinksEditor({
  values,
  onPatch,
  embedded = false,
}: {
  values: Record<string, string>;
  onPatch: (patch: Record<string, string>) => void;
  embedded?: boolean;
}) {
  const links = parseSocialLinks(values.contact_social_links, values);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function commitLinks(next: ContactSocialLink[]) {
    const firstIg = next.find((s) => s.platform === "instagram" && s.url.trim());
    onPatch({
      contact_social_links: JSON.stringify(next),
      ...(firstIg
        ? {
            contact_instagram_url: firstIg.url.trim(),
            contact_instagram_handle: firstIg.label.trim(),
          }
        : {}),
    });
  }

  function handleAdd() {
    const next: ContactSocialLink = {
      id: `social_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      platform: "tiktok",
      label: "@willdesign3d",
      url: "https://",
    };
    commitLinks([...links, next]);
  }

  function handleUpdate(id: string, patch: Partial<ContactSocialLink>) {
    commitLinks(links.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  }

  function handleDelete(id: string) {
    const remaining = links.filter((s) => s.id !== id);
    onPatch({
      contact_social_links: remaining.length === 0 ? "[]" : serializeSocialLinks(remaining),
    });
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIdx = links.findIndex((s) => s.id === active.id);
    const newIdx = links.findIndex((s) => s.id === over.id);
    if (oldIdx !== -1 && newIdx !== -1) {
      commitLinks(arrayMove(links, oldIdx, newIdx));
    }
  }

  const body = (
    <div className="space-y-4">
      {embedded && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">
            Añade y ordena tus perfiles de Instagram, TikTok, YouTube, Facebook, X, LinkedIn o enlaces propios.
          </p>
          <Button type="button" size="sm" variant="outline" onClick={handleAdd}>
            <Plus className="mr-1.5 h-4 w-4" /> Agregar red social
          </Button>
        </div>
      )}

      {links.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          No hay redes configuradas. Pulsa "Agregar red social" para añadir un perfil.
        </div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={links.map((s) => s.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-3">
              {links.map((s) => (
                <SortableSocialRow
                  key={s.id}
                  social={s}
                  onUpdate={handleUpdate}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </div>
  );

  if (embedded) return body;

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
        <div>
          <CardTitle className="text-base">Redes Sociales</CardTitle>
          <CardDescription>
            Añade y ordena tus perfiles de Instagram, TikTok, YouTube, Facebook, X, LinkedIn o enlaces propios.
          </CardDescription>
        </div>
        <Button type="button" size="sm" variant="outline" onClick={handleAdd}>
          <Plus className="mr-1.5 h-4 w-4" /> Agregar red social
        </Button>
      </CardHeader>
      <CardContent>{body}</CardContent>
    </Card>
  );
}

type CompanySubCardId = "orden" | "canales" | "redes" | "ubicacion";

function CompanyCollapsibleSubCard({
  index,
  title,
  subtitle,
  statusLabel,
  isConfigured,
  icon,
  isOpen,
  onToggle,
  children,
}: {
  index: number;
  title: string;
  subtitle: string;
  statusLabel: string;
  isConfigured: boolean;
  icon: ReactNode;
  isOpen: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  const uid = useId();
  const headerId = `${uid}-header`;
  const panelId = `${uid}-panel`;

  return (
    <div
      className={`overflow-hidden rounded-2xl border bg-card transition-colors ${
        isOpen ? "border-primary/40" : "border-border hover:border-border/80"
      }`}
    >
      <button
        id={headerId}
        type="button"
        aria-expanded={isOpen}
        aria-controls={panelId}
        onClick={onToggle}
        className={`flex w-full cursor-pointer select-none items-center gap-3 p-3.5 text-left transition-colors hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset sm:px-4 ${
          isOpen ? "bg-muted/20" : ""
        }`}
      >
        <span
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border transition-colors ${
            isConfigured
              ? "border-primary/25 bg-primary/10 text-primary"
              : "border-border bg-muted/50 text-muted-foreground"
          }`}
        >
          {icon}
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold tabular-nums text-muted-foreground">
              0{index + 1}.
            </span>
            <span className="text-sm font-bold text-foreground">{title}</span>
          </div>
          <p className="mt-0.5 truncate text-xs text-muted-foreground">{subtitle}</p>
        </div>

        <span
          className={`hidden shrink-0 items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-medium tabular-nums sm:inline-flex ${
            isConfigured
              ? "border-primary/25 bg-primary/10 text-primary"
              : "border-border bg-muted/50 text-muted-foreground"
          }`}
        >
          {isConfigured ? (
            <CheckCircle2 className="h-3 w-3 shrink-0" aria-hidden="true" />
          ) : (
            <CircleDashed className="h-3 w-3 shrink-0" aria-hidden="true" />
          )}
          <span>{statusLabel}</span>
        </span>

        <ChevronDown
          aria-hidden="true"
          className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 motion-reduce:transition-none ${
            isOpen ? "rotate-180 text-primary" : ""
          }`}
        />
      </button>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            id={panelId}
            role="region"
            aria-labelledby={headerId}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="space-y-6 border-t border-border/60 bg-card p-4 sm:p-5">
              <div className="flex items-center justify-between gap-2 sm:hidden">
                <span
                  className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-medium tabular-nums ${
                    isConfigured
                      ? "border-primary/25 bg-primary/10 text-primary"
                      : "border-border bg-muted/50 text-muted-foreground"
                  }`}
                >
                  {isConfigured ? (
                    <CheckCircle2 className="h-3 w-3 shrink-0" aria-hidden="true" />
                  ) : (
                    <CircleDashed className="h-3 w-3 shrink-0" aria-hidden="true" />
                  )}
                  <span>{statusLabel}</span>
                </span>
              </div>
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function CompanyDataAccordion({
  values,
  onPatch,
  locationFieldsContent,
}: {
  values: Record<string, string>;
  onPatch: (patch: Record<string, string>) => void;
  locationFieldsContent: ReactNode;
}) {
  const [openCards, setOpenCards] = useState<Set<CompanySubCardId>>(() => new Set());

  const channels = parseContactChannels(values.contact_channels, values);
  const socialLinks = parseSocialLinks(values.contact_social_links, values);
  const blocksOrder = parseContactBlocksOrder(values.contact_blocks_order);
  const hasLocationText = Boolean(
    values.contact_location_text?.trim() ||
      values.contact_location_short?.trim() ||
      values.site_area_served?.trim(),
  );
  const hasMapEmbed = Boolean(values.contact_map_embed_url?.trim());
  const isCustomOrder = Boolean(values.contact_blocks_order?.trim());

  const orderLabels: Record<ContactBlockKey, string> = {
    canales: "Canales",
    mapa: "Mapa",
    redes: "Redes",
    formulario: "Formulario",
  };
  const orderSummaryText = blocksOrder.map((k) => orderLabels[k]).join(" · ");

  const locationStatusLabel = hasLocationText && hasMapEmbed
    ? "Dirección y mapa"
    : hasLocationText
      ? "Solo dirección"
      : hasMapEmbed
        ? "Solo mapa"
        : "Pendiente";

  function toggleCard(id: CompanySubCardId) {
    setOpenCards((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const quickTabs: Array<{
    id: CompanySubCardId;
    num: string;
    shortTitle: string;
    configured: boolean;
  }> = [
    { id: "orden", num: "01", shortTitle: "Orden en /contacto", configured: isCustomOrder },
    { id: "canales", num: "02", shortTitle: `Canales (${channels.length})`, configured: channels.length > 0 },
    { id: "redes", num: "03", shortTitle: `Redes (${socialLinks.length})`, configured: socialLinks.length > 0 },
    { id: "ubicacion", num: "04", shortTitle: "Ubicación y Mapa", configured: hasLocationText || hasMapEmbed },
  ];

  return (
    <div className="space-y-5">
      {/* Barra de resumen superior */}
      <div className="rounded-2xl border border-border bg-muted/30 p-4 space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <p className="text-sm font-bold text-foreground">
              Fuente Única de Verdad — Datos de Empresa y Contacto
            </p>
            <p className="text-xs text-muted-foreground tabular-nums">
              <span className="font-semibold text-foreground">{channels.length}</span>{" "}
              {channels.length === 1 ? "canal directo configurado" : "canales directos configurados"}
              {" · "}
              <span className="font-semibold text-foreground">{socialLinks.length}</span>{" "}
              {socialLinks.length === 1 ? "red social enlazada" : "redes sociales enlazadas"}
              {" · "}
              Ubicación: <span className="font-semibold text-foreground">{locationStatusLabel}</span>
            </p>
            <p className="text-[11px] text-muted-foreground">
              Orden en /contacto: <span className="font-medium text-foreground">{orderSummaryText}</span>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <Button asChild variant="outline" size="sm" className="h-8 gap-1.5 text-xs whitespace-nowrap">
              <Link to="/contacto" target="_blank" rel="noopener noreferrer">
                <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Ver /contacto</span>
                <ExternalLink className="h-3 w-3 text-muted-foreground" aria-hidden="true" />
              </Link>
            </Button>
          </div>
        </div>

        <div
          className="flex flex-wrap items-center gap-1.5 border-t border-border/60 pt-3"
          aria-label="Accesos rápidos a bloques de empresa"
        >
          {quickTabs.map((tab) => {
            const isOpen = openCards.has(tab.id);
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => toggleCard(tab.id)}
                className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[11px] font-medium transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                  isOpen
                    ? "border-primary bg-primary/15 text-primary"
                    : tab.configured
                      ? "border-border bg-card text-foreground hover:bg-muted/50"
                      : "border-border/70 bg-background/60 text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab.configured ? (
                  <CheckCircle2 className="h-3 w-3 shrink-0 text-primary" aria-hidden="true" />
                ) : (
                  <CircleDashed className="h-3 w-3 shrink-0 text-muted-foreground" aria-hidden="true" />
                )}
                <span className="tabular-nums text-muted-foreground">{tab.num}</span>
                <span>{tab.shortTitle}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 4 Sub-tarjetas colapsables */}
      <div className="space-y-3">
        <CompanyCollapsibleSubCard
          index={0}
          title="Orden de Bloques en /contacto"
          subtitle="Arrastra para definir la secuencia visual de Canales, Mapa, Redes y Formulario"
          statusLabel={isCustomOrder ? "Personalizado" : "Predeterminado"}
          isConfigured={isCustomOrder}
          icon={<ArrowUpDown className="h-4 w-4" aria-hidden="true" />}
          isOpen={openCards.has("orden")}
          onToggle={() => toggleCard("orden")}
        >
          <ContactBlocksOrderEditor
            embedded
            rawOrder={values.contact_blocks_order}
            onChange={(serialized) => onPatch({ contact_blocks_order: serialized })}
          />
        </CompanyCollapsibleSubCard>

        <CompanyCollapsibleSubCard
          index={1}
          title="Canales Directos de Contacto"
          subtitle="Líneas de WhatsApp (ventas/taller), teléfonos y correos electrónicos"
          statusLabel={`${channels.length} ${channels.length === 1 ? "canal" : "canales"}`}
          isConfigured={channels.length > 0}
          icon={<Phone className="h-4 w-4" aria-hidden="true" />}
          isOpen={openCards.has("canales")}
          onToggle={() => toggleCard("canales")}
        >
          <ContactChannelsEditor embedded values={values} onPatch={onPatch} />
        </CompanyCollapsibleSubCard>

        <CompanyCollapsibleSubCard
          index={2}
          title="Redes Sociales Oficiales"
          subtitle="Perfiles ordenables con íconos oficiales de Instagram, TikTok, YouTube, X y más"
          statusLabel={`${socialLinks.length} ${socialLinks.length === 1 ? "red" : "redes"}`}
          isConfigured={socialLinks.length > 0}
          icon={<Globe className="h-4 w-4" aria-hidden="true" />}
          isOpen={openCards.has("redes")}
          onToggle={() => toggleCard("redes")}
        >
          <ContactSocialLinksEditor embedded values={values} onPatch={onPatch} />
        </CompanyCollapsibleSubCard>

        <CompanyCollapsibleSubCard
          index={3}
          title="Ubicación Física y Google Maps"
          subtitle="Dirección del taller, ciudad para JSON-LD y mapa embebido con vista previa"
          statusLabel={locationStatusLabel}
          isConfigured={hasLocationText || hasMapEmbed}
          icon={<MapPin className="h-4 w-4" aria-hidden="true" />}
          isOpen={openCards.has("ubicacion")}
          onToggle={() => toggleCard("ubicacion")}
        >
          <div className="space-y-6">{locationFieldsContent}</div>
        </CompanyCollapsibleSubCard>
      </div>
    </div>
  );
}
