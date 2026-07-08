import { useState } from "react";
import { MessageCircle, X } from "lucide-react";
import kiaraAsset from "@/assets/kiara.asset.json";

export function KiaraWidget() {
  const [open, setOpen] = useState(false);

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end gap-3 sm:bottom-6 sm:right-6">
      {open && (
        <div className="max-w-[18rem] rounded-2xl border border-border bg-card p-4 shadow-2xl">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2">
              <img
                src={kiaraAsset.url}
                alt="Kiara"
                width={36}
                height={36}
                className="h-9 w-9 rounded-full object-cover ring-2 ring-primary"
              />
              <div>
                <p className="text-sm font-bold text-foreground">Kiara 🐾</p>
                <p className="text-[11px] text-muted-foreground">Asistente virtual</p>
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              aria-label="Cerrar"
              className="rounded-full p-1 text-muted-foreground hover:bg-muted"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <p className="mt-3 text-sm text-foreground">
            ¡Hola! Soy <span className="font-semibold">Kiara</span>, ¿qué vamos
            a imprimir hoy? 🐕
          </p>
          <a
            href="https://wa.me/573000000000?text=Hola%20Kiara%2C%20quiero%20cotizar%20un%20proyecto"
            target="_blank"
            rel="noreferrer"
            className="btn-primary mt-3 w-full text-sm"
          >
            <MessageCircle className="h-4 w-4" />
            Chatear por WhatsApp
          </a>
        </div>
      )}

      {!open && (
        <div className="pointer-events-none mr-1 max-w-[14rem] rounded-2xl rounded-br-sm bg-card px-3 py-2 text-xs font-medium text-foreground shadow-lg ring-1 ring-border sm:text-sm">
          ¡Hola! Soy Kiara, ¿qué vamos a imprimir hoy?
        </div>
      )}

      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Abrir chat con Kiara"
        className="kiara-float group relative h-16 w-16 overflow-hidden rounded-full border-4 border-primary bg-card shadow-2xl transition hover:scale-105 sm:h-20 sm:w-20"
        style={{
          boxShadow:
            "0 20px 40px -10px color-mix(in oklab, var(--brand-orange) 55%, transparent)",
        }}
      >
        <img
          src={kiaraAsset.url}
          alt="Kiara, asistente virtual Pastor Alemán"
          width={80}
          height={80}
          className="h-full w-full object-cover"
        />
        <span className="absolute bottom-0 right-0 h-4 w-4 rounded-full border-2 border-card bg-secondary sm:h-5 sm:w-5" />
      </button>
    </div>
  );
}
