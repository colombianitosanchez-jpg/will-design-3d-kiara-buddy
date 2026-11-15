/** Select a still image without changing the media displayed in galleries. */
export function firstStaticShareImage(candidates: readonly (string | null | undefined)[]): string {
  for (const candidate of candidates) {
    const url = candidate?.trim();
    if (!url) continue;
    let path = url.split(/[?#]/, 1)[0];
    try { path = decodeURIComponent(path); } catch { /* Keep malformed escapes literal. */ }
    if (/\.(gif|mp4|webm|mov|m4v|ogv|avi|mkv)$/i.test(path)) continue;
    return url;
  }
  return "";
}