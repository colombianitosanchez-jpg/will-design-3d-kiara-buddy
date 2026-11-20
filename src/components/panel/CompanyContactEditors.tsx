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
}: {
  rawOrder?: string;
  onChange: (serialized: string) => void;
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

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Orden visual de la página /contacto</CardTitle>
        <CardDescription>
          El orden de estas tarjetas define el orden exacto en que se muestran en tu página pública de contacto. Arrastra y suelta para reorganizar.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={order} strategy={verticalListSortingStrategy}>
            <div className="space-y-2.5">
              {order.map((blockKey, idx) => (
                <SortableBlockRow key={blockKey} blockKey={blockKey} index={idx} />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      </CardContent>
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
}: {
  values: Record<string, string>;
  onPatch: (patch: Record<string, string>) => void;
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
      <CardContent>
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
      </CardContent>
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
}: {
  values: Record<string, string>;
  onPatch: (patch: Record<string, string>) => void;
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
      <CardContent>
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
      </CardContent>
    </Card>
  );
}
