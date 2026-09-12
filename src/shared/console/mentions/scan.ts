import { type MessageContext } from "@contracts/replies/answers"
import {
  parseResourceToken,
  type ReferenceKind,
  resourceTokenPattern,
} from "@contracts/replies/parts"
import { targetKey } from "../references"

// Mentions are explicit, sigil-prefixed tokens — `@Gmail`, `/meeting-prep`,
// `#send_message`, `+[table:k17…]`. Prose is never scanned for bare names,
// so an email like person@gmail.com or the word "linear" can never become
// a mention. Names come from a catalog the editor holds; a resource token
// carries its own kind and id inside brackets, so it needs no catalog and
// can never be prose by accident.

export const mentionKinds = [
  "integration",
  "skill",
  "tool",
  "resource",
] as const
export type MentionKind = (typeof mentionKinds)[number]

/** The kinds a sigil names by name, from a catalog. */
export type NamedMentionKind = Exclude<MentionKind, "resource">

export const mentionSigils = {
  integration: "@",
  skill: "/",
  tool: "#",
  resource: "+",
} as const satisfies Record<MentionKind, string>

export type MentionEntry = {
  id: string
  /** Lowercase spellings accepted after the sigil, longest first. */
  tokens: readonly string[]
}

/** What an editor recognizes: the names each sigil may take, and whether
 *  resource tokens are read at all. A kind left out is never matched. */
export type MentionCatalog = Partial<
  Record<NamedMentionKind, readonly MentionEntry[]>
> & {
  resource?: boolean
}

export type Mention = {
  end: number
  /** The name for a named kind; the target's key for a resource. */
  id: string
  kind: MentionKind
  start: number
}

/** The kinds a catalog recognizes, in sigil order. */
export function catalogKinds(catalog: MentionCatalog): MentionKind[] {
  return mentionKinds.filter((kind) =>
    kind === "resource"
      ? catalog.resource === true
      : catalog[kind] !== undefined
  )
}

export function readMentions(text: string, catalog: MentionCatalog): Mention[] {
  const kinds = catalogKinds(catalog)
  const mentions: Mention[] = []

  for (let index = 0; index < text.length; index += 1) {
    const kind = sigilKind(text[index], kinds)

    if (kind === null || !canStartMention(text, index)) {
      continue
    }

    const mention =
      kind === "resource"
        ? matchResourceMention(text, index)
        : matchNamedMention(text, index, kind, catalog[kind] ?? [])

    if (mention !== null) {
      mentions.push(mention)
      index = mention.end - 1
    }
  }

  return mentions
}

/** The text as its mentions divide it: the words between them and each
 *  mention where it stands, with no empty run of words. */
export function splitByMentions(
  text: string,
  catalog: MentionCatalog
): Array<{ text: string } | { mention: Mention }> {
  const segments: Array<{ text: string } | { mention: Mention }> = []
  let cursor = 0

  for (const mention of readMentions(text, catalog)) {
    if (mention.start > cursor) {
      segments.push({ text: text.slice(cursor, mention.start) })
    }

    segments.push({ mention })
    cursor = mention.end
  }

  if (cursor < text.length) {
    segments.push({ text: text.slice(cursor) })
  }

  return segments
}

/** A finished token at the very end of the text, as typing a boundary
 *  after it finds it. */
export function findCompletedMention(
  text: string,
  catalog: MentionCatalog
): Mention | null {
  return (
    readMentions(text, catalog).find(
      (mention) => mention.end === text.length
    ) ?? null
  )
}

export function isMentionNameCharacter(character: string | undefined) {
  return character !== undefined && /[a-z0-9_-]/i.test(character)
}

export function sigilKind(
  character: string | undefined,
  kinds: readonly MentionKind[] = mentionKinds
): MentionKind | null {
  return kinds.find((kind) => mentionSigils[kind] === character) ?? null
}

/** Mentions start at a text boundary. Requiring whitespace (or the start of
 *  text) keeps quoted examples, emails, URLs, paths, sums, and headings
 *  inert. */
export function canStartMention(text: string, sigilIndex: number) {
  const previous = text[sigilIndex - 1]

  return previous === undefined || /\s/.test(previous)
}

export function sortMentionTokens(tokens: readonly string[]) {
  return [...new Set(tokens)].sort(
    (left, right) => right.length - left.length || left.localeCompare(right)
  )
}

/** The target a resource mention names, or nothing for an id of another
 *  shape. */
export function parseResourceMention(id: unknown): MessageContext | null {
  return typeof id === "string" ? parseResourceToken(`+[${id}]`) : null
}

function matchResourceMention(text: string, sigilIndex: number) {
  const match = resourceTokenPattern.exec(text.slice(sigilIndex))

  if (match === null) {
    return null
  }

  return {
    end: sigilIndex + match[0].length,
    id: targetKey({
      kind: match[1].toLowerCase() as ReferenceKind,
      id: match[2],
    }),
    kind: "resource" as const,
    start: sigilIndex,
  }
}

function matchNamedMention(
  text: string,
  sigilIndex: number,
  kind: NamedMentionKind,
  entries: readonly MentionEntry[]
): Mention | null {
  const tokenStart = sigilIndex + 1

  for (const entry of entries) {
    for (const token of entry.tokens) {
      const tokenEnd = tokenStart + token.length
      const candidate = text.slice(tokenStart, tokenEnd).toLowerCase()

      if (candidate === token && isMentionEnd(text[tokenEnd])) {
        return { end: tokenEnd, id: entry.id, kind, start: sigilIndex }
      }
    }
  }

  return null
}

function isMentionEnd(character: string | undefined) {
  return character === undefined || !/[a-z0-9_]/i.test(character)
}
