/** Collapse whitespace runs to single spaces and trim the ends — the
 *  single-line rule shared by previews, labels, and summaries. */
export function collapseWhitespace(value: string) {
  return value.replace(/\s+/g, " ").trim()
}
