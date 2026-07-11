import { findFuzzyAutomationSurfaceIntegration } from "./fuzzy"
import { automationMentionText } from "./mentions"
import {
  type AutomationMention,
  type AutomationMentionCatalog,
  emptyAutomationMentionCatalog,
  isMentionNameCharacter,
  readAutomationMentions,
} from "./scan"

// Instructions written before explicit sigils (or typed loosely) carry bare
// or misspelled integration names. Opening them in the builder rewrites
// those to canonical `@Label` tokens once, at this edge — scanning at rest
// stays exact and never touches prose.

type TokenRange = { end: number; start: number }
type MentionReplacement = TokenRange & { text: string }

export function sigilizeAutomationMentions(
  text: string,
  catalog: AutomationMentionCatalog = emptyAutomationMentionCatalog
) {
  const replacements = readSigilizeReplacements(text, catalog)

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

/** A finished explicit token at the very end of the text — what the editor
 *  converts into a pill the moment a boundary character is typed. Fuzzy
 *  spellings are accepted for integrations only. */
export function findCompletedAutomationMention(
  text: string,
  catalog: AutomationMentionCatalog
): AutomationMention | null {
  const mentions = readAutomationMentions(text, catalog)
  const exact = mentions.find((mention) => mention.end === text.length)

  if (exact !== undefined) {
    return exact
  }

  return (
    readFuzzyIntegrationMatches(text, mentions).find(
      (mention) => mention.end === text.length
    ) ?? null
  )
}

function readSigilizeReplacements(
  text: string,
  catalog: AutomationMentionCatalog
): MentionReplacement[] {
  const taken: TokenRange[] = [...readAutomationMentions(text, catalog)]
  const replacements: MentionReplacement[] = []
  const fuzzyAndBare = [
    ...readFuzzyIntegrationMatches(text, taken),
    ...readBareIntegrationMatches(text, taken),
  ]

  for (const match of fuzzyAndBare) {
    if (!overlapsAny(match.start, match.end, taken)) {
      replacements.push(toReplacement(match))
      taken.push(match)
    }
  }

  return replacements.sort((left, right) => left.start - right.start)
}

function readFuzzyIntegrationMatches(
  text: string,
  taken: readonly TokenRange[]
): AutomationMention[] {
  const matches: AutomationMention[] = []

  for (let index = 0; index < text.length; index += 1) {
    if (text[index] !== "@" || isMentionNameCharacter(text[index - 1])) {
      continue
    }

    const token = readWordToken(text, index + 1)

    if (token === null || overlapsAny(index, token.end, taken)) {
      continue
    }

    const integration = findFuzzyAutomationSurfaceIntegration(token.value)

    if (integration !== null) {
      matches.push({
        end: token.end,
        id: integration,
        kind: "integration",
        start: index,
      })
      index = token.end - 1
    }
  }

  return matches
}

// Bare names only convert on an exact alias match: fuzzy matching here would
// rewrite innocent prose ("Mail" is one edit from "gmail").
function readBareIntegrationMatches(
  text: string,
  taken: readonly TokenRange[]
): AutomationMention[] {
  const matches: AutomationMention[] = []
  const entries = emptyAutomationMentionCatalog.integration

  for (let index = 0; index < text.length; index += 1) {
    if (!canStartBareToken(text, index)) {
      continue
    }

    const match = matchBareAlias(text, index, entries)

    if (match !== null && !overlapsAny(match.start, match.end, taken)) {
      matches.push(match)
      index = match.end - 1
    }
  }

  return matches
}

function matchBareAlias(
  text: string,
  start: number,
  entries: (typeof emptyAutomationMentionCatalog)["integration"]
): AutomationMention | null {
  const tail = text.slice(start).toLowerCase()

  for (const entry of entries) {
    for (const token of entry.tokens) {
      if (
        tail.startsWith(token) &&
        !isMentionNameCharacter(tail[token.length])
      ) {
        return {
          end: start + token.length,
          id: entry.id,
          kind: "integration",
          start,
        }
      }
    }
  }

  return null
}

function canStartBareToken(text: string, start: number) {
  if (!/[a-z0-9]/i.test(text[start])) {
    return false
  }

  const previous = text[start - 1]

  return previous !== "@" && !isMentionNameCharacter(previous)
}

function readWordToken(text: string, start: number) {
  let end = start

  while (end < text.length && /[a-z0-9-]/i.test(text[end])) {
    end += 1
  }

  return end === start ? null : { end, value: text.slice(start, end) }
}

function overlapsAny(start: number, end: number, taken: readonly TokenRange[]) {
  return taken.some((range) => start < range.end && range.start < end)
}

function toReplacement(mention: AutomationMention): MentionReplacement {
  return {
    end: mention.end,
    start: mention.start,
    text: automationMentionText(mention.kind, mention.id),
  }
}
