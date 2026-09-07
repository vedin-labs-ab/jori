import {
  canStartMention,
  isMentionNameCharacter,
  type MentionKind,
  sigilKind,
} from "./scan"

const maxMentionQueryLength = 32
export const maxActiveMentionLength = maxMentionQueryLength + 2

/** The sigil-started token the cursor is inside: what is being looked for,
 *  and where the token stands. */
export type ActiveMention = {
  end: number
  kind: MentionKind
  query: string
  start: number
}

export function findActiveMention(
  text: string,
  cursor: number,
  kinds: readonly MentionKind[]
): ActiveMention | null {
  if (cursor < 0 || cursor > text.length) {
    return null
  }

  const earliestStart = Math.max(0, cursor - maxActiveMentionLength)

  for (let start = cursor - 1; start >= earliestStart; start -= 1) {
    const kind = sigilKind(text[start], kinds)

    if (kind !== null) {
      return activeMentionAt(text, cursor, start, kind)
    }

    if (!isMentionNameCharacter(text[start])) {
      return null
    }
  }

  return null
}

function activeMentionAt(
  text: string,
  cursor: number,
  start: number,
  kind: MentionKind
): ActiveMention | null {
  if (!canStartMention(text, start)) {
    return null
  }

  const query = text.slice(start + 1, cursor)

  if (query.length > maxMentionQueryLength || /[^a-z0-9_-]/i.test(query)) {
    return null
  }

  return { end: cursor, kind, query, start }
}
