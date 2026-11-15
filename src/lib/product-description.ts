/** Plain-text summaries for cards; never render stored HTML in a summary. */
export function productPlainText(value?: string | null): string {
  return (value ?? "")
    .replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/&(?:nbsp|amp|lt|gt|quot|apos|#39);/gi, (entity) => ({
      "&nbsp;": " ", "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"', "&apos;": "'", "&#39;": "'",
    })[entity.toLowerCase()] ?? " ")
    .replace(/\s+/g, " ").trim();
}

export function productSummary(product: { short?: string; description?: string }): string {
  const short = productPlainText(product.short);
  if (short) return short;
  const description = productPlainText(product.description);
  return description.length > 180 ? `${description.slice(0, 177).trimEnd()}…` : description;
}

export function productDisplayName(parentName: string, variant?: { name: string } | null): string {
  return variant?.name.trim() ? `${parentName} — ${variant.name.trim()}` : parentName;
}