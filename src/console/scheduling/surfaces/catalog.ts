export const scheduleReadScopes = ["selected", "allConnected"] as const
export const scheduleSurfaceAccesses = ["read", "write", "both"] as const

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

export type ScheduleReadScope = (typeof scheduleReadScopes)[number]
export type ScheduleSurfaceAccess = (typeof scheduleSurfaceAccesses)[number]
export type ScheduleSurfaceProvider =
  (typeof scheduleSurfaceProviders)[number]["provider"]
export type ScheduleSurfaceProviderMeta =
  (typeof scheduleSurfaceProviders)[number]

export type ScheduleSurfaceFormValue = {
  provider: ScheduleSurfaceProvider
  access: ScheduleSurfaceAccess | ""
}

export function getScheduleSurfaceProvider(provider: ScheduleSurfaceProvider) {
  return scheduleSurfaceProviders.find((item) => item.provider === provider)
}

export function getScheduleSurfaceLabel(provider: ScheduleSurfaceProvider) {
  return getScheduleSurfaceProvider(provider)?.label ?? provider
}

export function getScheduleSurfaceLogo(provider: ScheduleSurfaceProvider) {
  return `/logos/providers/${providerLogoName(provider)}.svg`
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
