import {
  getScheduleSurfaceLabel,
  type ScheduleSurfaceProvider,
  scheduleSurfaceProviders,
} from "./catalog"
import { getProviderSuggestionScore, normalizeFuzzyAlias } from "./fuzzy"
import {
  isMentionNameCharacter,
  readScheduleSurfaceMentionMatches,
} from "./scan"

export type ScheduleSurfaceMentionPart = {
  provider?: ScheduleSurfaceProvider
  text: string
}

export type ScheduleSurfaceSuggestion = {
  label: string
  provider: ScheduleSurfaceProvider
}

export type ActiveScheduleSurfaceMention = {
  end: number
  kind: "bare" | "explicit"
  query: string
  start: number
}

export function findScheduleSurfaceMentions(
  text: string
): ScheduleSurfaceProvider[] {
  const providers: ScheduleSurfaceProvider[] = []
  const seen = new Set<ScheduleSurfaceProvider>()

  for (const match of readScheduleSurfaceMentionMatches(text)) {
    if (!seen.has(match.provider)) {
      seen.add(match.provider)
      providers.push(match.provider)
    }
  }

  return providers
}

export function findActiveScheduleSurfaceMention(
  text: string,
  cursor: number
): ActiveScheduleSurfaceMention | null {
  return (
    findActiveExplicitMention(text, cursor) ??
    findActiveBareMention(text, cursor)
  )
}

function findActiveExplicitMention(
  text: string,
  cursor: number
): ActiveScheduleSurfaceMention | null {
  if (cursor < 0 || cursor > text.length) {
    return null
  }

  const start = text.lastIndexOf("@", cursor - 1)

  if (start < 0 || (start > 0 && isMentionNameCharacter(text[start - 1]))) {
    return null
  }

  const query = text.slice(start + 1, cursor)

  if (query.length > 32 || /[^a-z0-9-]/i.test(query)) {
    return null
  }

  return { end: cursor, kind: "explicit", query, start }
}

function findActiveBareMention(
  text: string,
  cursor: number
): ActiveScheduleSurfaceMention | null {
  if (cursor < 0 || cursor > text.length) {
    return null
  }

  let start = cursor

  while (start > 0 && /[a-z0-9-]/i.test(text[start - 1])) {
    start -= 1
  }

  const query = text.slice(start, cursor)
  const previous = text[start - 1]

  if (
    query.length < 3 ||
    previous === "@" ||
    isMentionNameCharacter(previous) ||
    getScheduleSurfaceSuggestions(query).length === 0
  ) {
    return null
  }

  return { end: cursor, kind: "bare", query, start }
}

export function getScheduleSurfaceSuggestions(
  query: string
): ScheduleSurfaceSuggestion[] {
  const normalizedQuery = normalizeFuzzyAlias(query)

  return scheduleSurfaceProviders
    .map((item) => ({
      label: item.label,
      provider: item.provider,
      score: getProviderSuggestionScore(normalizedQuery, item),
    }))
    .filter((item) => item.score > 0)
    .sort(
      (left, right) =>
        right.score - left.score || left.label.localeCompare(right.label)
    )
    .slice(0, 6)
    .map(({ label, provider }) => ({ label, provider }))
}

export function replaceScheduleSurfaceMention(
  text: string,
  mention: ActiveScheduleSurfaceMention,
  provider: ScheduleSurfaceProvider
) {
  const replacement = getScheduleSurfaceLabel(provider)
  const suffix = text.slice(mention.end)
  const separator =
    suffix === "" || isMentionNameCharacter(suffix[0]) ? " " : ""
  const nextText = `${text.slice(0, mention.start)}${replacement}${separator}${suffix}`

  return {
    cursor: mention.start + replacement.length + separator.length,
    text: nextText,
  }
}

export function getScheduleSurfaceMentionParts(
  text: string
): ScheduleSurfaceMentionPart[] {
  const matches = readScheduleSurfaceMentionMatches(text)

  if (matches.length === 0) {
    return [{ text }]
  }

  const parts: ScheduleSurfaceMentionPart[] = []
  let cursor = 0

  for (const match of matches) {
    if (match.start > cursor) {
      parts.push({ text: text.slice(cursor, match.start) })
    }

    parts.push({
      provider: match.provider,
      text: text.slice(match.start, match.end),
    })
    cursor = match.end
  }

  if (cursor < text.length) {
    parts.push({ text: text.slice(cursor) })
  }

  return parts
}
