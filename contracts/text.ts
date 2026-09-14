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

/** Automatic labels avoid visible peers; explicit names may still repeat. */
export function availableName(base: string, names: Iterable<string>) {
  const used = new Set(Array.from(names, (name) => name.trim().toLowerCase()))
  let name = base
  let suffix = 0
  while (used.has(name.toLowerCase())) {
    name = `${base} ${++suffix}`
  }
  return name
}
