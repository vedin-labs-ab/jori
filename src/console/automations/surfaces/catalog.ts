export const automationSurfaceAccesses = ["read", "write", "both"] as const

export const automationSurfaceProviders = [
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

export type AutomationSurfaceAccess = (typeof automationSurfaceAccesses)[number]
export type AutomationSurfaceProvider =
  (typeof automationSurfaceProviders)[number]["provider"]
export type AutomationSurfaceProviderMeta =
  (typeof automationSurfaceProviders)[number]

export type AutomationSurfaceFormValue = {
  provider: AutomationSurfaceProvider
  tools: string[]
}

export function getAutomationSurfaceProvider(
  provider: AutomationSurfaceProvider
) {
  return automationSurfaceProviders.find((item) => item.provider === provider)
}

export function isAutomationSurfaceProvider(
  provider: unknown
): provider is AutomationSurfaceProvider {
  return (
    typeof provider === "string" &&
    automationSurfaceProviders.some((item) => item.provider === provider)
  )
}

export function getAutomationSurfaceLabel(provider: AutomationSurfaceProvider) {
  return getAutomationSurfaceProvider(provider)?.label ?? provider
}

export function getAutomationSurfaceLogo(provider: AutomationSurfaceProvider) {
  return `/logos/providers/${providerLogoName(provider)}.svg`
}

function provider<const Provider extends string>(
  provider: Provider,
  label: string,
  aliases: readonly string[]
) {
  return { aliases, label, provider }
}

function providerLogoName(provider: AutomationSurfaceProvider) {
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
