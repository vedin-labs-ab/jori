export const automationSurfaceAccesses = ["read", "write", "both"] as const

export const automationSurfaceIntegrations = [
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
export type AutomationSurfaceIntegration =
  (typeof automationSurfaceIntegrations)[number]["provider"]
export type AutomationSurfaceIntegrationMeta =
  (typeof automationSurfaceIntegrations)[number]

export type AutomationSurfaceFormValue = {
  provider: AutomationSurfaceIntegration
  tools: string[]
}

export function getAutomationSurfaceIntegration(
  provider: AutomationSurfaceIntegration
) {
  return automationSurfaceIntegrations.find(
    (item) => item.provider === provider
  )
}

export function isAutomationSurfaceIntegration(
  provider: unknown
): provider is AutomationSurfaceIntegration {
  return (
    typeof provider === "string" &&
    automationSurfaceIntegrations.some((item) => item.provider === provider)
  )
}

export function getAutomationSurfaceLabel(
  provider: AutomationSurfaceIntegration
) {
  return getAutomationSurfaceIntegration(provider)?.label ?? provider
}

export function getAutomationSurfaceLogo(
  provider: AutomationSurfaceIntegration
) {
  return `/logos/providers/${providerLogoName(provider)}.svg`
}

function provider<const Provider extends string>(
  provider: Provider,
  label: string,
  aliases: readonly string[]
) {
  return { aliases, label, provider }
}

function providerLogoName(provider: AutomationSurfaceIntegration) {
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
