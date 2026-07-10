import { getAutomationSurfaceLabel } from "./catalog"
import { findFuzzyAutomationSurfaceIntegration } from "./fuzzy"
import {
  canStartBareMention,
  isMentionNameCharacter,
  type MentionMatch,
  overlaps,
  readAutomationSurfaceMentionMatches,
} from "./scan"

type NormalizationOptions = {
  includeEnd: boolean
}

type MentionReplacement = MentionMatch & {
  text: string
}

export function normalizeAutomationSurfaceMentions(text: string) {
  return normalizeSurfaceMentions(text, { includeEnd: true })
}

export function normalizeCompletedAutomationSurfaceMentions(text: string) {
  return normalizeSurfaceMentions(text, { includeEnd: false })
}

export function findCompletedAutomationSurfaceMention(
  text: string
): MentionMatch | null {
  return (
    readMentionReplacements(text, { includeEnd: true }).find(
      (replacement) => replacement.end === text.length
    ) ?? null
  )
}

function normalizeSurfaceMentions(text: string, options: NormalizationOptions) {
  const replacements = readMentionReplacements(text, options)

  if (replacements.length === 0) {
    return text
  }

  let next = ""
  let cursor = 0

  for (const replacement of replacements) {
    next += text.slice(cursor, replacement.start)
    next += replacement.text
    cursor = replacement.end
  }

  return next + text.slice(cursor)
}

function readMentionReplacements(
  text: string,
  options: NormalizationOptions
): MentionReplacement[] {
  const replacements = readAutomationSurfaceMentionMatches(text)
    .filter((match) => canNormalizeEnd(text, match.end, options))
    .map((match) => toMentionReplacement(match))

  for (const match of readFuzzyMentionMatches(text, options)) {
    if (!replacements.some((replacement) => overlaps(replacement, match))) {
      replacements.push(toMentionReplacement(match))
    }
  }

  for (const match of readFuzzyBareMatches(text, options)) {
    if (!replacements.some((replacement) => overlaps(replacement, match))) {
      replacements.push(toMentionReplacement(match))
    }
  }

  return replacements.sort((left, right) => left.start - right.start)
}

function readFuzzyMentionMatches(
  text: string,
  options: NormalizationOptions
): MentionMatch[] {
  const matches: MentionMatch[] = []

  for (let index = 0; index < text.length; index += 1) {
    if (text[index] !== "@") {
      continue
    }

    const match = matchFuzzyMention(text, index, options)

    if (match !== null) {
      matches.push(match)
      index = match.end - 1
    }
  }

  return matches
}

function readFuzzyBareMatches(
  text: string,
  options: NormalizationOptions
): MentionMatch[] {
  const matches: MentionMatch[] = []

  for (let index = 0; index < text.length; index += 1) {
    if (!canStartBareMention(text, index)) {
      continue
    }

    const match = matchFuzzyBare(text, index, options)

    if (match !== null) {
      matches.push(match)
      index = match.end - 1
    }
  }

  return matches
}

function matchFuzzyMention(
  text: string,
  start: number,
  options: NormalizationOptions
): MentionMatch | null {
  if (start > 0 && isMentionNameCharacter(text[start - 1])) {
    return null
  }

  const token = readMentionToken(text, start + 1)

  if (token === null || !canNormalizeEnd(text, token.end, options)) {
    return null
  }

  const integration = findFuzzyAutomationSurfaceIntegration(token.value)

  return integration === null ? null : { end: token.end, integration, start }
}

function matchFuzzyBare(
  text: string,
  start: number,
  options: NormalizationOptions
): MentionMatch | null {
  const token = readMentionToken(text, start)

  if (token === null || !canNormalizeEnd(text, token.end, options)) {
    return null
  }

  const integration = findFuzzyAutomationSurfaceIntegration(token.value, {
    allowPrefix: false,
  })

  return integration === null ? null : { end: token.end, integration, start }
}

function readMentionToken(text: string, start: number) {
  let end = start

  while (end < text.length && /[a-z0-9-]/i.test(text[end])) {
    end += 1
  }

  if (end === start) {
    return null
  }

  return {
    end,
    value: text.slice(start, end),
  }
}

function canNormalizeEnd(
  text: string,
  end: number,
  options: NormalizationOptions
) {
  if (end === text.length) {
    return options.includeEnd
  }

  return !isMentionNameCharacter(text[end])
}

function toMentionReplacement(match: MentionMatch): MentionReplacement {
  return {
    ...match,
    text: getAutomationSurfaceLabel(match.integration),
  }
}
