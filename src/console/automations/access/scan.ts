import {
  type AutomationSurfaceIntegration,
  automationSurfaceIntegrations,
} from "./catalog"

export type MentionMatch = {
  end: number
  provider: AutomationSurfaceIntegration
  start: number
}

const mentionAliases = automationSurfaceIntegrations
  .flatMap((item) =>
    [...item.aliases, item.label].map((alias) => ({
      alias: alias.toLowerCase(),
      provider: item.provider,
    }))
  )
  .sort((left, right) => right.alias.length - left.alias.length)

export function readAutomationSurfaceMentionMatches(text: string) {
  const matches = [
    ...readExplicitMentionMatches(text),
    ...readBareMentionMatches(text),
  ]

  return matches
    .filter(
      (match, index) =>
        !matches.some(
          (candidate, candidateIndex) =>
            candidateIndex < index && overlaps(candidate, match)
        )
    )
    .sort((left, right) => left.start - right.start)
}

export function isMentionNameCharacter(character: string | undefined) {
  return character !== undefined && /[a-z0-9_-]/i.test(character)
}

function readExplicitMentionMatches(text: string) {
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

function readBareMentionMatches(text: string) {
  const matches: MentionMatch[] = []

  for (let index = 0; index < text.length; index += 1) {
    if (!canStartBareMention(text, index)) {
      continue
    }

    const match = matchBareMention(text, index)

    if (match !== null) {
      matches.push(match)
      index = match.end - 1
    }
  }

  return matches
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

function matchBareMention(text: string, start: number): MentionMatch | null {
  const tail = text.slice(start).toLowerCase()

  for (const candidate of mentionAliases) {
    if (
      tail.startsWith(candidate.alias) &&
      isMentionBoundary(tail[candidate.alias.length])
    ) {
      return {
        start,
        end: start + candidate.alias.length,
        provider: candidate.provider,
      }
    }
  }

  return null
}

function canStartBareMention(text: string, start: number) {
  if (!/[a-z0-9]/i.test(text[start])) {
    return false
  }

  const previous = text[start - 1]

  return previous !== "@" && !isMentionNameCharacter(previous)
}

function isMentionBoundary(character: string | undefined) {
  return character === undefined || !/[a-z0-9]/.test(character)
}

function overlaps(left: MentionMatch, right: MentionMatch) {
  return left.start < right.end && right.start < left.end
}
