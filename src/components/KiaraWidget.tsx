import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouterState } from "@tanstack/react-router";
import { ChevronDown, MessageCircle, Radio, Send } from "lucide-react";
import kiaraAsset from "@/assets/kiara.asset.json";
import { useLive } from "@/lib/live-store";
import { siteContentQuery, getContactInfo, waLink } from "@/lib/catalog";
import { useKiaraChat } from "@/hooks/use-kiara-chat";
import { KiaraQuoteCard, KiaraOrderCard, KiaraProductsCard } from "@/components/KiaraToolCards";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function KiaraWidget() {
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  });
  const isPanel = pathname.startsWith("/panel");

  return <KiaraWidgetContent isPanel={isPanel} />;
}

function KiaraWidgetContent({ isPanel }: { isPanel: boolean }) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const { isLive, platform, url } = useLive();
  const { data: content } = useQuery(siteContentQuery());
  const customMessage = content?.kiara_message?.trim();
  const kiaraImg = content?.kiara_image_url?.trim() || kiaraAsset.url;
  const contact = getContactInfo(content);
  const whatsappUrl = waLink(contact.whatsapp, "Hola Kiara, quiero cotizar un proyecto");

  const greeting = isLive
    ? `¡Guau! Mis humanos están EN VIVO en ${platform} ahora mismo. ¿Quieres el enlace?`
    : customMessage ||
      "¡Hola! Soy Kiara 🐾 ¿Qué vamos a imprimir hoy? Pregúntame por precios, materiales o servicios.";

  const { messages, sending, send, reset } = useKiaraChat(greeting);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    reset(greeting);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [greeting]);

  useEffect(() => {
    if (open && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, open, sending]);

  const teaser = isLive
    ? "¡Guau! Mis humanos están en vivo ahora mismo, ¡ven a verlos!"
    : customMessage || "¡Hola! Soy Kiara, ¿qué vamos a imprimir hoy?";

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const text = input;
    setInput("");
    send(text);
  }

  return (
    <div
      className={cn(
        "fixed z-50 flex flex-col gap-3",
        isPanel
          ? "bottom-3 left-3 items-start sm:bottom-6 sm:left-6"
          : "bottom-4 right-4 items-end sm:bottom-6 sm:right-6 max-sm:left-4",
      )}
    >
      {open && (
        <section
          aria-label="Chat con Kiara"
          className={cn(
            "flex h-[500px] max-h-[80vh] w-[350px] flex-col overflow-hidden rounded-2xl border border-border bg-background shadow-2xl",
            isPanel
              ? "max-sm:h-[65dvh] max-sm:max-h-[65dvh] max-sm:w-[min(22rem,calc(100vw-1.5rem))]"
              : "max-sm:h-[85dvh] max-sm:max-h-[85dvh] max-sm:w-full max-sm:rounded-b-none max-sm:rounded-t-2xl",
          )}
        >
          <div className="flex items-center gap-2 border-b border-border bg-muted/40 px-4 py-3">
            <img
              src={kiaraImg}
              alt="Kiara"
              width={36}
              height={36}
              className="h-9 w-9 rounded-full object-cover ring-2 ring-primary"
            />
            <div className="min-w-0 flex-1">
              <h2 className="truncate text-sm font-bold text-foreground">Kiara 🐾</h2>
              <p className="text-[11px] text-muted-foreground">
                {sending ? "escribiendo…" : "Asistente virtual"}
              </p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Minimizar chat con Kiara"
              onClick={() => setOpen(false)}
              className="h-8 w-8 shrink-0 rounded-full"
            >
              <ChevronDown className="h-4 w-4" />
            </Button>
          </div>

          {isLive && (
            <a
              href={url || "#"}
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-center gap-2 bg-red-600 px-3 py-2 text-xs font-bold text-white hover:opacity-90"
            >
              <Radio className="h-3.5 w-3.5" /> Ver transmisión en {platform}
            </a>
          )}

          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-3 py-3">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex flex-col ${m.role === "user" ? "items-end" : "items-start"}`}
              >
                {m.content && (
                  <div
                    className={`max-w-[85%] whitespace-pre-line rounded-2xl px-3 py-2 text-sm ${
                      m.role === "user"
                        ? "rounded-br-sm bg-[var(--brand-wine)] text-white"
                        : "rounded-bl-sm bg-muted text-foreground"
                    }`}
                  >
                    {m.content}
                  </div>
                )}
                {m.tool?.name === "quote_service" && <KiaraQuoteCard quote={m.tool.data} />}
                {m.tool?.name === "create_order" && <KiaraOrderCard order={m.tool.data} />}
                {m.tool?.name === "search_products" && (
                  <KiaraProductsCard products={m.tool.data} />
                )}
              </div>
            ))}

            {sending && (
              <div className="flex justify-start">
                <div className="rounded-2xl rounded-bl-sm bg-muted px-3 py-2 text-sm text-muted-foreground">
                  <span className="inline-flex gap-1">
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-current" />
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-current [animation-delay:120ms]" />
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-current [animation-delay:240ms]" />
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <form
            onSubmit={onSubmit}
            className="flex items-center gap-2 border-t border-border bg-background px-2 py-2"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              maxLength={1000}
              placeholder="Escríbele a Kiara…"
              className="flex-1 rounded-full border border-input bg-background px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
            <Button
              type="submit"
              size="icon"
              disabled={sending || !input.trim()}
              aria-label="Enviar"
              className="h-9 w-9 shrink-0 rounded-full bg-[var(--brand-orange)] text-white hover:opacity-90 disabled:opacity-50"
            >
              <Send className="h-4 w-4" />
            </Button>
          </form>
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-center gap-2 border-t border-border bg-muted/40 py-2 text-xs font-semibold text-foreground hover:bg-muted"
          >
            <MessageCircle className="h-3.5 w-3.5" /> Prefiero WhatsApp
          </a>
        </section>
      )}

      {!open && (
        <div
          className={cn(
            "pointer-events-none max-w-[15rem] rounded-2xl bg-card px-3 py-2 text-xs font-medium text-foreground shadow-lg ring-1 ring-border sm:text-sm",
            isPanel ? "ml-1 rounded-bl-sm" : "mr-1 rounded-br-sm",
          )}
          style={
            isLive
              ? {
                  background: "color-mix(in oklab, #dc2626 12%, white)",
                  borderColor: "#dc2626",
                }
              : undefined
          }
        >
          {teaser}
        </div>
      )}

      {!open && (
        <Button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Abrir chat con Kiara"
          className={cn(
            "kiara-float group relative overflow-hidden rounded-full border-4 border-primary bg-card p-0 shadow-2xl transition hover:scale-105",
            isPanel ? "h-14 w-14 sm:h-16 sm:w-16" : "h-16 w-16 sm:h-20 sm:w-20",
          )}
          style={{
            boxShadow:
              "0 20px 40px -10px color-mix(in oklab, var(--brand-orange) 55%, transparent)",
            borderColor: isLive ? "#dc2626" : undefined,
          }}
        >
          <img
            src={kiaraImg}
            alt="Kiara, asistente virtual Pastor Alemán"
            width={80}
            height={80}
            className="h-full w-full object-cover"
          />
          <span
            className={`absolute bottom-0 right-0 h-4 w-4 rounded-full border-2 border-card sm:h-5 sm:w-5 ${
              isLive ? "animate-pulse" : ""
            }`}
            style={{ background: isLive ? "#dc2626" : "var(--brand-teal)" }}
          />
        </Button>
      )}
    </div>
  );
}
