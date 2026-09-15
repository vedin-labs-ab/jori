import { collapseWhitespace } from "../../../contracts/text"

type Match = { start: number; end: number }
const budget = 120

/** Display windows are independent of source offsets. Never rewrite the text
 * used by locators, revision checks, or the search index. */
export function excerpt(text: string, query: string) {
  const focus = bestMatch(text, query)
  const { start, end } = windowAround(text, focus)
  const snippet = collapseWhitespace(text.slice(start, end))
  return {
    snippet: `${start ? "…" : ""}${snippet}${end < text.length ? "…" : ""}`,
    focus,
  }
}

function bestMatch(text: string, query: string): Match | undefined {
  const phrase = query.trim()
  if (!phrase) {
    return
  }
  const exact = new RegExp(escapePattern(phrase), "iu").exec(text)
  if (exact) {
    return { start: exact.index, end: exact.index + exact[0].length }
  }
  const terms = [
    ...new Set(phrase.toLocaleLowerCase().match(/[\p{L}\p{N}]+/gu) ?? []),
  ].slice(0, 16)
  const matches = terms
    .flatMap((term, id) =>
      Array.from(text.matchAll(new RegExp(escapePattern(term), "giu"))).map(
        (match) => ({
          id,
          start: match.index,
          end: match.index + match[0].length,
        })
      )
    )
    .sort((a, b) => a.start - b.start)
  return densestMatch(matches)
}

function densestMatch(matches: (Match & { id: number })[]) {
  const counts = new Map<number, number>()
  let left = 0,
    score = 0
  let best: Match | undefined
  let shortest = Infinity
  for (const [right, match] of matches.entries()) {
    counts.set(match.id, (counts.get(match.id) ?? 0) + 1)
    while (
      left < right &&
      (match.end - matches[left].start > budget ||
        (counts.get(matches[left].id) ?? 0) > 1)
    ) {
      removeMatch(counts, matches[left++].id)
    }
    const start = matches[left]?.start ?? match.start
    if (
      counts.size > score ||
      (counts.size === score && match.end - start < shortest)
    ) {
      score = counts.size
      best = { start, end: match.end }
      shortest = match.end - start
    }
  }
  return best
}

function removeMatch(counts: Map<number, number>, id: number) {
  const count = (counts.get(id) ?? 1) - 1
  if (count) {
    counts.set(id, count)
  } else {
    counts.delete(id)
  }
}

function windowAround(text: string, focus?: Match): Match {
  const match = focus ?? { start: 0, end: 0 }
  const padding = Math.max(
    0,
    Math.floor((budget - (match.end - match.start)) / 2)
  )
  let start = Math.max(0, match.start - padding)
  let end = Math.min(text.length, Math.max(start + budget, match.end))
  start = Math.max(0, Math.min(start, end - budget))
  // Keep short sentences/lines intact and drop adjacent, unrelated sentences.
  const before = [
    ...text.slice(start, match.start).matchAll(/[.!?]\s+|\n+/g),
  ].at(-1)
  if (before) {
    start += before.index + before[0].length
  } else if (start && /\S/.test(text[start - 1])) {
    const boundary = /\s+/.exec(text.slice(start, match.start))
    start = boundary ? start + boundary.index + boundary[0].length : match.start
  }
  const after = /[.!?][*_`~]*(?=\s|$)|\n/.exec(text.slice(match.end, end))
  if (after) {
    end = match.end + after.index + (after[0] === "\n" ? 0 : after[0].length)
  } else if (end < text.length && /\S/.test(text[end])) {
    const boundary = [...text.slice(match.end, end).matchAll(/\s+/g)].at(-1)
    end = boundary ? match.end + boundary.index : Math.max(match.end, end)
  }
  return { start, end }
}

function escapePattern(text: string) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}
