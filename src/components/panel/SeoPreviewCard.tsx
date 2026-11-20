import { useState } from "react";
import { Search } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getCanonicalBaseUrl, resolvePageSeo, type GranularSeoPageKey } from "@/lib/seo";

export function SeoPreviewCard({ values }: { values: Record<string, string> }) {
  const [selectedPage, setSelectedPage] = useState<GranularSeoPageKey>("home");

  const baseUrl = getCanonicalBaseUrl(values);
  const hostLabel = (() => {
    try {
      return new URL(baseUrl).hostname.toUpperCase();
    } catch {
      return (
        baseUrl.replace(/^https?:\/\//i, "").split("/")[0]?.toUpperCase() ||
        "WILL-DESIGN-3D.LOVABLE.APP"
      );
    }
  })();

  const pathMap: Record<GranularSeoPageKey, string> = {
    home: "/",
    tienda: "/tienda",
    servicios: "/servicios",
    cotizador: "/cotizador",
    galeria: "/galeria",
    nosotros: "/nosotros",
    contacto: "/contacto",
  };

  const resolved = resolvePageSeo(selectedPage, values);
  const curr = {
    url: `${baseUrl}${pathMap[selectedPage]}`,
    title: resolved.title,
    desc: resolved.description,
    img: resolved.image,
  };

  return (
    <Card className="border-2 border-primary/30 bg-card mb-6">
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <CardTitle className="text-lg font-black flex items-center gap-2">
              <Search className="h-5 w-5 text-primary" /> Vista Previa SEO e Impacto Social
            </CardTitle>
            <CardDescription>
              Simulación de cómo ven Google, WhatsApp y Facebook tus enlaces al compartirlos.
            </CardDescription>
          </div>
          <Select value={selectedPage} onValueChange={(v) => setSelectedPage(v as GranularSeoPageKey)}>
            <SelectTrigger className="w-56">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="home">Página de Inicio (/)</SelectItem>
              <SelectItem value="tienda">Tienda (/tienda)</SelectItem>
              <SelectItem value="servicios">Servicios (/servicios)</SelectItem>
              <SelectItem value="cotizador">Cotizador (/cotizador)</SelectItem>
              <SelectItem value="galeria">Galería (/galeria)</SelectItem>
              <SelectItem value="nosotros">Nosotros (/nosotros)</SelectItem>
              <SelectItem value="contacto">Contacto (/contacto)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-6 md:grid-cols-2">
          {/* Google Preview */}
          <div className="rounded-2xl border border-border bg-white p-4 text-black dark:bg-slate-900 dark:text-white">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground block mb-2">
              Google Search Result
            </span>
            <div className="text-xs text-emerald-700 dark:text-emerald-400 font-mono truncate">
              {curr.url}
            </div>
            <div className="text-base font-medium text-blue-700 dark:text-blue-400 hover:underline cursor-pointer line-clamp-1 mt-0.5">
              {curr.title || <span className="text-muted-foreground italic">Sin título configurado</span>}
            </div>
            <div className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 mt-1">
              {curr.desc || (
                <span className="text-muted-foreground italic">Sin descripción configurada</span>
              )}
            </div>
          </div>

          {/* Social Media Preview */}
          <div className="rounded-2xl border border-border bg-slate-50 dark:bg-slate-950 p-4">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground block mb-2">
              WhatsApp / Facebook / Twitter Card
            </span>
            <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
              <div className="aspect-[1.91/1] w-full overflow-hidden bg-muted">
                {curr.img ? (
                  <img src={curr.img} alt="Preview" className="h-full w-full object-cover" />
                ) : (
                  <div className="grid h-full w-full place-items-center text-xs text-muted-foreground">
                    Sin miniatura configurada
                  </div>
                )}
              </div>
              <div className="p-3">
                <span className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider block">
                  {hostLabel}
                </span>
                <p className="text-sm font-bold text-foreground line-clamp-1 mt-0.5">
                  {curr.title || <span className="text-muted-foreground italic">Sin título configurado</span>}
                </p>
                <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                  {curr.desc || (
                    <span className="text-muted-foreground italic">Sin descripción configurada</span>
                  )}
                </p>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
