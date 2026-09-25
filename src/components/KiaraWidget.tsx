import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouterState } from "@tanstack/react-router";
import { MessageCircle, Radio, Send } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import kiaraAsset from "@/assets/kiara.asset.json";
import { useLive } from "@/lib/live-store";
import { siteContentQuery, getContactInfo, waLink } from "@/lib/catalog";
import { useKiaraChat } from "@/hooks/use-kiara-chat";
import { KiaraQuoteCard, KiaraOrderCard, KiaraProductsCard } from "@/components/KiaraToolCards";

export function KiaraWidget() {
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  });

  if (pathname.startsWith("/panel")) {
    return null;
  }

  return <KiaraWidgetContent />;
}

function KiaraWidgetContent() {
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
    <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end gap-3 sm:bottom-6 sm:right-6">
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="right"
          className="flex w-full flex-col gap-0 p-0 sm:max-w-md"
        >
          {/* Header */}
          <div className="flex items-center gap-2 border-b border-border bg-muted/40 px-4 py-3 pr-12">
            <img
              src={kiaraImg}
              alt="Kiara"
              width={36}
              height={36}
              className="h-9 w-9 rounded-full object-cover ring-2 ring-primary"
            />
            <div>
              <SheetTitle className="text-sm font-bold text-foreground">Kiara 🐾</SheetTitle>
              <SheetDescription className="text-[11px]">
                {sending ? "escribiendo…" : "Asistente virtual"}
              </SheetDescription>
            </div>
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

          {/* Messages */}
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
            <button
              type="submit"
              disabled={sending || !input.trim()}
              aria-label="Enviar"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--brand-orange)] text-white transition hover:opacity-90 disabled:opacity-50"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-center gap-2 border-t border-border bg-muted/40 py-2 text-xs font-semibold text-foreground hover:bg-muted"
          >
            <MessageCircle className="h-3.5 w-3.5" /> Prefiero WhatsApp
          </a>
        </SheetContent>
      </Sheet>

      {!open && (
        <div
          className="pointer-events-none mr-1 max-w-[15rem] rounded-2xl rounded-br-sm bg-card px-3 py-2 text-xs font-medium text-foreground shadow-lg ring-1 ring-border sm:text-sm"
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

      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Abrir chat con Kiara"
        className="kiara-float group relative h-16 w-16 overflow-hidden rounded-full border-4 border-primary bg-card shadow-2xl transition hover:scale-105 sm:h-20 sm:w-20"
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
      </button>
    </div>
  );
}
