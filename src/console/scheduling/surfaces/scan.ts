import {
  type ScheduleSurfaceProvider,
  scheduleSurfaceProviders,
} from "./catalog"

export type MentionMatch = {
  end: number
  provider: ScheduleSurfaceProvider
  start: number
}

const mentionAliases = scheduleSurfaceProviders
  .flatMap((item) =>
    [...item.aliases, item.label].map((alias) => ({
      alias: alias.toLowerCase(),
      provider: item.provider,
    }))
  )
  .sort((left, right) => right.alias.length - left.alias.length)

export function readScheduleSurfaceMentionMatches(text: string) {
  const matches: MentionMatch[] = []

  for (let index = 0; index < text.length; index += 1) {
    if (text[index] !== "@") {
      continue
    }

    const match = matchMention(text, index)

    if (match !== null) {
      matches.push(match)
      index = match.end - 1
    }
  }

  return matches
}

export function isMentionNameCharacter(character: string | undefined) {
  return character !== undefined && /[a-z0-9_-]/i.test(character)
}

function matchMention(text: string, start: number): MentionMatch | null {
  const tail = text
    .slice(start + 1)
    .toLowerCase()
    .replace(/\s+/g, " ")

  for (const candidate of mentionAliases) {
    if (
      tail.startsWith(candidate.alias) &&
      isMentionBoundary(tail[candidate.alias.length])
    ) {
      return {
        start,
        end: start + 1 + candidate.alias.length,
        provider: candidate.provider,
      }
    }
  }

  return null
}

function isMentionBoundary(character: string | undefined) {
  return character === undefined || !/[a-z0-9]/.test(character)
}
