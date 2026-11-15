import { useEffect, useState } from "react";
import { productPlainText } from "@/lib/product-description";

/** Sanea HTML solo en el navegador (DOMPurify necesita DOM); en el servidor muestra texto plano. */
export function RichDescription({ html, className }: { html: string; className?: string }) {
  const [clean, setClean] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    import("dompurify").then(({ default: DOMPurify }) => {
      if (!alive) return;
      setClean(
        DOMPurify.sanitize(html ?? "", {
          ALLOWED_TAGS: ["p", "br", "strong", "b", "em", "i", "u", "s", "ul", "ol", "li", "h1", "h2", "h3", "h4", "blockquote", "code", "pre", "span", "a"],
          ALLOWED_ATTR: ["href", "target", "rel"],
          ALLOWED_URI_REGEXP: /^(?:https?:|mailto:|tel:|#|\/)/i,
        }),
      );
    });
    return () => { alive = false; };
  }, [html]);
  if (clean === null) return <p className={`${className ?? ""} whitespace-pre-line`}>{productPlainText(html)}</p>;
  return <div className={className} dangerouslySetInnerHTML={{ __html: clean }} />;
}
