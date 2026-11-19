import { useId, useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import {
  BookOpen,
  CheckCircle2,
  ChevronDown,
  CircleDashed,
  Compass,
  ExternalLink,
  Eye,
  Factory,
  HeartHandshake,
  PawPrint,
  Target,
  Trophy,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  ABOUT_BLOCKS,
  getAboutBlocksSummary,
  type AboutBlockDef,
  type AboutBlockIcon,
  type AboutBlockId,
} from "@/lib/about-editor";

function BlockIcon({
  icon,
  isCustomized,
}: {
  icon: AboutBlockIcon;
  isCustomized: boolean;
}) {
  const cls = "h-4 w-4 shrink-0";
  const wrapperCls = `flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border transition-colors ${
    isCustomized
      ? "border-primary/25 bg-primary/10 text-primary"
      : "border-border bg-muted/50 text-muted-foreground"
  }`;

  let el: ReactNode;
  switch (icon) {
    case "book":
      el = <BookOpen className={cls} aria-hidden="true" />;
      break;
    case "trophy":
      el = <Trophy className={cls} aria-hidden="true" />;
      break;
    case "target":
      el = <Target className={cls} aria-hidden="true" />;
      break;
    case "compass":
      el = <Compass className={cls} aria-hidden="true" />;
      break;
    case "heart":
      el = <HeartHandshake className={cls} aria-hidden="true" />;
      break;
    case "paw":
      el = <PawPrint className={cls} aria-hidden="true" />;
      break;
    case "factory":
      el = <Factory className={cls} aria-hidden="true" />;
      break;
  }

  return <span className={wrapperCls}>{el}</span>;
}

function AboutSubCard({
  block,
  index,
  isOpen,
  isCustomized,
  itemCount,
  onToggle,
  renderFieldByKey,
}: {
  block: AboutBlockDef;
  index: number;
  isOpen: boolean;
  isCustomized: boolean;
  itemCount: number;
  onToggle: () => void;
  renderFieldByKey: (key: string) => ReactNode;
}) {
  const uid = useId();
  const headerId = `${uid}-header`;
  const panelId = `${uid}-panel`;

  const statusLabel = isCustomized
    ? itemCount > 0
      ? `Personalizado (${itemCount})`
      : "Personalizado"
    : "Predeterminado";

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
        <BlockIcon icon={block.icon} isCustomized={isCustomized} />

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold tabular-nums text-muted-foreground">
              0{index + 1}.
            </span>
            <span className="text-sm font-bold text-foreground">{block.title}</span>
          </div>
          <p className="mt-0.5 truncate text-xs text-muted-foreground">{block.subtitle}</p>
        </div>

        <span
          className={`hidden shrink-0 items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-medium tabular-nums sm:inline-flex ${
            isCustomized
              ? "border-primary/25 bg-primary/10 text-primary"
              : "border-border bg-muted/50 text-muted-foreground"
          }`}
        >
          {isCustomized ? (
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
                    isCustomized
                      ? "border-primary/25 bg-primary/10 text-primary"
                      : "border-border bg-muted/50 text-muted-foreground"
                  }`}
                >
                  {isCustomized ? (
                    <CheckCircle2 className="h-3 w-3 shrink-0" aria-hidden="true" />
                  ) : (
                    <CircleDashed className="h-3 w-3 shrink-0" aria-hidden="true" />
                  )}
                  <span>{statusLabel}</span>
                </span>
              </div>
              {block.fieldKeys.map((key) => renderFieldByKey(key))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function AboutSectionEditor({
  values,
  renderFieldByKey,
}: {
  values: Record<string, string>;
  renderFieldByKey: (key: string) => ReactNode;
}) {
  const [openBlocks, setOpenBlocks] = useState<Set<AboutBlockId>>(() => new Set());
  const summary = getAboutBlocksSummary(values);

  function toggleBlock(id: AboutBlockId) {
    setOpenBlocks((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className="space-y-5">
      {/* Barra superior de accesos directos y resumen visual */}
      <div className="rounded-2xl border border-border bg-muted/30 p-4 space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-bold text-foreground">
              Bloques de &ldquo;Nosotros&rdquo;
            </p>
            <p className="text-xs text-muted-foreground tabular-nums">
              <span className="font-semibold text-foreground">{summary.customizedCount}</span> de{" "}
              <span className="font-semibold text-foreground">{summary.totalCount}</span> bloques
              con contenido personalizado (los demás usan valores predeterminados).
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <Button asChild variant="outline" size="sm" className="h-8 gap-1.5 text-xs whitespace-nowrap">
              <Link to="/nosotros" target="_blank" rel="noopener noreferrer">
                <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Ver página /nosotros</span>
                <ExternalLink className="h-3 w-3 text-muted-foreground" aria-hidden="true" />
              </Link>
            </Button>

            <Button asChild variant="outline" size="sm" className="h-8 gap-1.5 text-xs whitespace-nowrap">
              <Link to="/" hash="nosotros" target="_blank" rel="noopener noreferrer">
                <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Ver en Inicio</span>
              </Link>
            </Button>
          </div>
        </div>

        {/* Resumen rápido interactivo por bloque */}
        <div
          className="flex flex-wrap items-center gap-1.5 border-t border-border/60 pt-3"
          aria-label="Resumen de bloques configurados"
        >
          {summary.blocks.map((b, idx) => {
            const isOpen = openBlocks.has(b.id);
            return (
              <button
                key={b.id}
                type="button"
                onClick={() => toggleBlock(b.id)}
                className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[11px] font-medium transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                  isOpen
                    ? "border-primary bg-primary/15 text-primary"
                    : b.isCustomized
                      ? "border-border bg-card text-foreground hover:bg-muted/50"
                      : "border-border/70 bg-background/60 text-muted-foreground hover:text-foreground"
                }`}
                title={`${b.title} — ${b.isCustomized ? "Personalizado" : "Predeterminado"}`}
              >
                {b.isCustomized ? (
                  <CheckCircle2 className="h-3 w-3 shrink-0 text-primary" aria-hidden="true" />
                ) : (
                  <CircleDashed className="h-3 w-3 shrink-0 text-muted-foreground" aria-hidden="true" />
                )}
                <span className="tabular-nums text-muted-foreground">0{idx + 1}</span>
                <span className="truncate max-w-[140px]">{b.title.split(" (")[0]}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 7 Sub-tarjetas colapsables temáticas */}
      <div className="space-y-3">
        {ABOUT_BLOCKS.map((block, index) => {
          const status = summary.blocks[index];
          return (
            <AboutSubCard
              key={block.id}
              block={block}
              index={index}
              isOpen={openBlocks.has(block.id)}
              isCustomized={status?.isCustomized ?? false}
              itemCount={status?.itemCount ?? 0}
              onToggle={() => toggleBlock(block.id)}
              renderFieldByKey={renderFieldByKey}
            />
          );
        })}
      </div>
    </div>
  );
}
