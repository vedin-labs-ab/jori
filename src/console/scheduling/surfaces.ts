export const scheduleReadScopes = ["selected", "allConnected"] as const
export const scheduleSurfaceAccesses = ["read", "write", "both"] as const

export type ScheduleReadScope = (typeof scheduleReadScopes)[number]
export type ScheduleSurfaceAccess = (typeof scheduleSurfaceAccesses)[number]
export type ScheduleSurfaceProvider =
  (typeof scheduleSurfaceProviders)[number]["provider"]

export type ScheduleSurfaceFormValue = {
  provider: ScheduleSurfaceProvider
  access: ScheduleSurfaceAccess | ""
}

export const scheduleSurfaceProviders = [
  provider("slack", "Slack", ["slack"]),
  provider("linear", "Linear", ["linear"]),
  provider("github", "GitHub", ["github", "git hub"]),
  provider("gmail", "Gmail", ["gmail", "google mail"]),
  provider("googleCalendar", "Google Calendar", [
    "google calendar",
    "googlecalendar",
    "gcal",
  ]),
  provider("googleDrive", "Google Drive", [
    "google drive",
    "googledrive",
    "drive",
  ]),
  provider("notion", "Notion", ["notion"]),
  provider("microsoftEmail", "Outlook Mail", [
    "outlook",
    "outlook mail",
    "microsoft email",
    "microsoft mail",
  ]),
  provider("microsoftCalendar", "Microsoft Calendar", [
    "microsoft calendar",
    "microsoftcalendar",
    "outlook calendar",
  ]),
] as const

const mentionAliases = scheduleSurfaceProviders
  .flatMap((item) =>
    [...item.aliases, item.label].map((alias) => ({
      alias: normalizeAlias(alias),
      provider: item.provider,
    }))
  )
  .sort((left, right) => right.alias.length - left.alias.length)

export function getScheduleSurfaceProvider(provider: ScheduleSurfaceProvider) {
  return scheduleSurfaceProviders.find((item) => item.provider === provider)
}

export function getScheduleSurfaceLabel(provider: ScheduleSurfaceProvider) {
  return getScheduleSurfaceProvider(provider)?.label ?? provider
}

export function getScheduleSurfaceLogo(provider: ScheduleSurfaceProvider) {
  return `/logos/providers/${providerLogoName(provider)}.svg`
}

export function findScheduleSurfaceMentions(
  text: string
): ScheduleSurfaceProvider[] {
  const providers: ScheduleSurfaceProvider[] = []
  const seen = new Set<ScheduleSurfaceProvider>()

  for (const match of readMentionMatches(text)) {
    if (!seen.has(match.provider)) {
      seen.add(match.provider)
      providers.push(match.provider)
    }
  }

  return providers
}

export function normalizeScheduleSurfaceMentions(text: string) {
  const matches = readMentionMatches(text)

  if (matches.length === 0) {
    return text
  }

  let next = ""
  let cursor = 0

  for (const match of matches) {
    next += text.slice(cursor, match.start)
    next += `@${getScheduleSurfaceLabel(match.provider)}`
    cursor = match.end
  }

  return next + text.slice(cursor)
}

export function insertScheduleSurfaceMention(
  text: string,
  provider: ScheduleSurfaceProvider
) {
  if (findScheduleSurfaceMentions(text).includes(provider)) {
    return text
  }

  const marker = `@${getScheduleSurfaceLabel(provider)}`
  const separator = text === "" || /\s$/.test(text) ? "" : " "

  return `${text}${separator}${marker}`
}

export function removeScheduleSurfaceMention(
  text: string,
  provider: ScheduleSurfaceProvider
) {
  const matches = readMentionMatches(text)

  if (!matches.some((match) => match.provider === provider)) {
    return text
  }

  let next = ""
  let cursor = 0

  for (const match of matches) {
    next += text.slice(cursor, match.start)

    if (match.provider !== provider) {
      next += text.slice(match.start, match.end)
    }

    cursor = match.end
  }

  return next
    .concat(text.slice(cursor))
    .replace(/\s{2,}/g, " ")
    .trim()
}

export function syncScheduleSurfaces(
  text: string,
  surfaces: ScheduleSurfaceFormValue[],
  readScope: ScheduleReadScope
): ScheduleSurfaceFormValue[] {
  const existing = new Map(
    surfaces.map((surface) => [surface.provider, surface.access])
  )

  return findScheduleSurfaceMentions(text).map((provider) => ({
    provider,
    access: existing.get(provider) ?? defaultAccess(readScope),
  }))
}

export function applyScheduleReadScope(
  surfaces: ScheduleSurfaceFormValue[],
  readScope: ScheduleReadScope
): ScheduleSurfaceFormValue[] {
  return surfaces.map((surface) => ({
    ...surface,
    access:
      readScope === "allConnected"
        ? surface.access || "read"
        : surface.access === "read"
          ? ""
          : surface.access,
  }))
}

export function hasScheduleWriteSurface(surfaces: ScheduleSurfaceFormValue[]) {
  return surfaces.some(
    (surface) => surface.access === "write" || surface.access === "both"
  )
}

type MentionMatch = {
  end: number
  provider: ScheduleSurfaceProvider
  start: number
}

function readMentionMatches(text: string): MentionMatch[] {
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

function matchMention(text: string, start: number): MentionMatch | null {
  const tail = normalizeTail(text.slice(start + 1))

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

function normalizeTail(value: string) {
  return value.toLowerCase().replace(/\s+/g, " ")
}

function normalizeAlias(value: string) {
  return value.toLowerCase()
}

function defaultAccess(readScope: ScheduleReadScope) {
  return readScope === "allConnected" ? "read" : ""
}

function provider<const Provider extends string>(
  provider: Provider,
  label: string,
  aliases: readonly string[]
) {
  return { aliases, label, provider }
}

function providerLogoName(provider: ScheduleSurfaceProvider) {
  if (provider === "googleCalendar") {
    return "google-calendar"
  }

  if (provider === "googleDrive") {
    return "google-drive"
  }

  if (provider === "microsoftCalendar") {
    return "microsoft-calendar"
  }

  if (provider === "microsoftEmail") {
    return "microsoft-email"
  }

  return provider
}
