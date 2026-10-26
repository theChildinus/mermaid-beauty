/** Prefer Mermaid's rendered pixel cap; fall back to a measured viewport width. */
export function naturalSvgWidth(maxWidth: string, fallbackWidth?: number): string | undefined {
  const match = /^([0-9]+(?:\.[0-9]+)?)px$/i.exec(maxWidth.trim());
  const inlineWidth = match ? Number(match[1]) : undefined;
  const width = inlineWidth && Number.isFinite(inlineWidth) ? inlineWidth : fallbackWidth;
  return width && Number.isFinite(width) && width > 0 ? `${width}px` : undefined;
}
