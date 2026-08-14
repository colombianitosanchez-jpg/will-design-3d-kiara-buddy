import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle } from "lucide-react";
import { reportLovableError } from "@/lib/lovable-error-reporting";

type Props = { children: ReactNode; label?: string };
type State = { error: Error | null };

/** Evita la "pantalla negra": captura errores de render y muestra un fallback de marca. */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[ErrorBoundary]", error, info?.componentStack);
    try {
      reportLovableError(error, { boundary: this.props.label ?? "app_error_boundary" });
    } catch {
      /* ignore */
    }
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div className="flex min-h-[60vh] items-center justify-center bg-background px-4 py-16">
        <div className="w-full max-w-md rounded-3xl border border-border bg-card p-8 text-center shadow-sm">
          <div
            className="mx-auto grid h-14 w-14 place-items-center rounded-2xl"
            style={{
              background: "color-mix(in oklab, var(--brand-orange) 15%, white)",
              color: "var(--brand-orange)",
            }}
          >
            <AlertTriangle className="h-7 w-7" />
          </div>
          <h2 className="mt-4 text-xl font-black">Algo se salió del molde</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Kiara 🐾 ya tomó nota. Puedes intentarlo de nuevo o volver al inicio.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => this.setState({ error: null })}
              className="btn-outline text-sm"
            >
              Reintentar
            </button>
            <a href="/" className="btn-primary text-sm">
              Volver al inicio
            </a>
          </div>
        </div>
      </div>
    );
  }
}
