import { automationSurfaceIntegrations } from "./catalog"

// Mentions are explicit, sigil-prefixed tokens — `@Gmail`, `/meeting-prep`,
// `#send_message`. Prose is never scanned for bare names, so an email like
// person@gmail.com or the word "linear" can never become a mention.

const automationMentionKinds = ["integration", "skill", "tool"] as const
export type AutomationMentionKind = (typeof automationMentionKinds)[number]

export const automationMentionSigils = {
  integration: "@",
  skill: "/",
  tool: "#",
} as const satisfies Record<AutomationMentionKind, string>

type AutomationMentionEntry = {
  id: string
  /** Lowercase spellings accepted after the sigil, longest first. */
  tokens: readonly string[]
}

export type AutomationMentionCatalog = Record<
  AutomationMentionKind,
  readonly AutomationMentionEntry[]
>

export type AutomationMention = {
  end: number
  id: string
  kind: AutomationMentionKind
  start: number
}

const integrationEntries: AutomationMentionEntry[] =
  automationSurfaceIntegrations.map((item) => ({
    id: item.integration,
    tokens: sortTokens([item.label.toLowerCase(), ...item.aliases]),
  }))

/** Integrations are static; skills and tools are supplied by the edge that
 *  has them (the skills query and the resolved tool permissions). */
export function createAutomationMentionCatalog(
  input: { skills?: readonly string[]; tools?: readonly string[] } = {}
): AutomationMentionCatalog {
  return {
    integration: integrationEntries,
    skill: (input.skills ?? []).map((name) => ({
      id: name,
      tokens: [name.toLowerCase()],
    })),
    tool: (input.tools ?? []).map((tool) => ({
      id: tool,
      tokens: [tool.toLowerCase()],
    })),
  }
}

export const emptyAutomationMentionCatalog = createAutomationMentionCatalog()

export function readAutomationMentions(
  text: string,
  catalog: AutomationMentionCatalog
): AutomationMention[] {
  const mentions: AutomationMention[] = []

  for (let index = 0; index < text.length; index += 1) {
    const kind = sigilKind(text[index])

    if (kind === null || !canStartMention(kind, text, index)) {
      continue
    }

    const mention = matchMention(text, index, kind, catalog[kind])

    if (mention !== null) {
      mentions.push(mention)
      index = mention.end - 1
    }
  }

  return mentions
}

export function isMentionNameCharacter(character: string | undefined) {
  return character !== undefined && /[a-z0-9_-]/i.test(character)
}

export function sigilKind(
  character: string | undefined
): AutomationMentionKind | null {
  for (const kind of automationMentionKinds) {
    if (automationMentionSigils[kind] === character) {
      return kind
    }
  }

  return null
}

/** Mentions start at a text boundary. Requiring whitespace (or the start of
 * text) keeps quoted examples, emails, URLs, paths, and headings inert. */
export function canStartMention(
  _kind: AutomationMentionKind,
  text: string,
  sigilIndex: number
) {
  const previous = text[sigilIndex - 1]

  return previous === undefined || /\s/.test(previous)
}

function matchMention(
  text: string,
  sigilIndex: number,
  kind: AutomationMentionKind,
  entries: readonly AutomationMentionEntry[]
): AutomationMention | null {
  const tokenStart = sigilIndex + 1

  for (const entry of entries) {
    for (const token of entry.tokens) {
      const tokenEnd = tokenStart + token.length
      const candidate = text.slice(tokenStart, tokenEnd).toLowerCase()

      if (candidate === token && isMentionEnd(text[tokenEnd])) {
        return {
          end: tokenEnd,
          id: entry.id,
          kind,
          start: sigilIndex,
        }
      }
    }
  }

  return null
}

function isMentionEnd(character: string | undefined) {
  return character === undefined || !/[a-z0-9_]/i.test(character)
}

function sortTokens(tokens: readonly string[]) {
  return [...new Set(tokens)].sort(
    (left, right) => right.length - left.length || left.localeCompare(right)
  )
}
