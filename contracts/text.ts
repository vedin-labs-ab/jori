/** Collapse whitespace runs to single spaces and trim the ends — the
 *  single-line rule shared by previews, labels, and summaries. */
export function collapseWhitespace(value: string) {
  return value.replace(/\s+/g, " ").trim()
}

/** Escape text for interpolation into HTML markup, such as email bodies. */
export function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
}
