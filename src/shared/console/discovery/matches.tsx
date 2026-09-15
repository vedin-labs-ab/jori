/** Literal, case-insensitive matches only. React escapes the text; snippets
 * and queries never become HTML or regular-expression instructions. */
export function Matches({ text, query }: { text: string; query: string }) {
  const terms = [...new Set(query.trim().slice(0, 200).split(/\s+/))]
    .filter(Boolean)
    .sort((a, b) => b.length - a.length)
    .slice(0, 16)
  if (!terms.length) {
    return text
  }
  const pattern = new RegExp(
    terms.map((term) => term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|"),
    "giu"
  )
  const parts = []
  let start = 0
  for (const match of text.matchAll(pattern)) {
    parts.push(text.slice(start, match.index))
    parts.push(
      <mark
        className="bg-transparent font-semibold text-foreground"
        key={match.index}
      >
        {match[0]}
      </mark>
    )
    start = match.index + match[0].length
  }
  parts.push(text.slice(start))
  return parts
}
