import {
  type AutomationSurfaceIntegration,
  automationSurfaceIntegrations,
  getAutomationSurfaceLabel,
} from "./catalog"
import { getIntegrationSuggestionScore, normalizeFuzzyAlias } from "./fuzzy"
import {
  isMentionNameCharacter,
  readAutomationSurfaceMentionMatches,
} from "./scan"

export type AutomationSurfaceMentionPart = {
  provider?: AutomationSurfaceIntegration
  text: string
}

export type AutomationSurfaceSuggestion = {
  label: string
  provider: AutomationSurfaceIntegration
}

export type ActiveAutomationSurfaceMention = {
  end: number
  kind: "bare" | "explicit"
  query: string
  start: number
}

export function findAutomationSurfaceMentions(
  text: string
): AutomationSurfaceIntegration[] {
  const integrations: AutomationSurfaceIntegration[] = []
  const seen = new Set<AutomationSurfaceIntegration>()

  for (const match of readAutomationSurfaceMentionMatches(text)) {
    if (!seen.has(match.provider)) {
      seen.add(match.provider)
      integrations.push(match.provider)
    }
  }

  return integrations
}

export function findActiveAutomationSurfaceMention(
  text: string,
  cursor: number
): ActiveAutomationSurfaceMention | null {
  return (
    findActiveExplicitMention(text, cursor) ??
    findActiveBareMention(text, cursor)
  )
}

function findActiveExplicitMention(
  text: string,
  cursor: number
): ActiveAutomationSurfaceMention | null {
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
): ActiveAutomationSurfaceMention | null {
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
    getAutomationSurfaceSuggestions(query).length === 0
  ) {
    return null
  }

  return { end: cursor, kind: "bare", query, start }
}

export function getAutomationSurfaceSuggestions(
  query: string
): AutomationSurfaceSuggestion[] {
  const normalizedQuery = normalizeFuzzyAlias(query)

  return automationSurfaceIntegrations
    .map((item) => ({
      label: item.label,
      provider: item.provider,
      score: getIntegrationSuggestionScore(normalizedQuery, item),
    }))
    .filter((item) => item.score > 0)
    .sort(
      (left, right) =>
        right.score - left.score || left.label.localeCompare(right.label)
    )
    .slice(0, 6)
    .map(({ label, provider }) => ({ label, provider }))
}

export function replaceAutomationSurfaceMention(
  text: string,
  mention: ActiveAutomationSurfaceMention,
  provider: AutomationSurfaceIntegration
) {
  const replacement = getAutomationSurfaceLabel(provider)
  const suffix = text.slice(mention.end)
  const separator =
    suffix === "" || isMentionNameCharacter(suffix[0]) ? " " : ""
  const nextText = `${text.slice(0, mention.start)}${replacement}${separator}${suffix}`

  return {
    cursor: mention.start + replacement.length + separator.length,
    text: nextText,
  }
}

export function getAutomationSurfaceMentionParts(
  text: string
): AutomationSurfaceMentionPart[] {
  const matches = readAutomationSurfaceMentionMatches(text)

  if (matches.length === 0) {
    return [{ text }]
  }

  const parts: AutomationSurfaceMentionPart[] = []
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
