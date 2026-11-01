/**
 * Abre una URL externa (como wa.me o api.whatsapp.com) garantizando que se abra
 * siempre en una pestaña/ventana nueva del navegador (target="_blank", noopener, noreferrer).
 *
 * Esto evita de raíz el error `ERR_BLOCKED_BY_RESPONSE` provocado por cabeceras
 * `X-Frame-Options: DENY` de WhatsApp cuando la app se ejecuta dentro de un iframe
 * (como en el preview de Lovable donde window.self !== window.top).
 */
export function openExternalUrl(url: string | null | undefined): void {
  if (!url || typeof window === "undefined") return;

  const trimmed = url.trim();
  if (!trimmed || trimmed === "#") return;

  try {
    // Si estamos dentro de un iframe o en un navegador estándar, window.open con '_blank' y specs
    // fuerza la creación de una nueva ventana/pestaña desacoplada del iframe actual.
    const newWindow = window.open(trimmed, "_blank", "noopener,noreferrer");

    // En ciertos navegadores móviles o contextos embebidos donde window.open devuelva null o falle:
    if (!newWindow || newWindow.closed || typeof newWindow.closed === "undefined") {
      const a = document.createElement("a");
      a.href = trimmed;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      // Añadir temporalmente al DOM y disparar evento de clic nativo
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  } catch (err) {
    // Fallback de enlace DOM si window.open arroja SecurityError en iframe restringido
    try {
      const a = document.createElement("a");
      a.href = trimmed;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch {
      console.error("No se pudo abrir la URL externa de WhatsApp:", trimmed);
    }
  }
}
