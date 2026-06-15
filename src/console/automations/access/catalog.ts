export const automationSurfaceAccesses = ["read", "write", "both"] as const

export const automationSurfaceIntegrations = [
  integration("slack", "Slack", ["slack"]),
  integration("linear", "Linear", ["linear"]),
  integration("github", "GitHub", ["github", "git hub"]),
  integration("gmail", "Gmail", ["gmail", "google mail"]),
  integration("googleCalendar", "Google Calendar", [
    "google calendar",
    "googlecalendar",
    "gcal",
  ]),
  integration("googleDrive", "Google Drive", [
    "google drive",
    "googledrive",
    "drive",
  ]),
  integration("notion", "Notion", ["notion"]),
  integration("microsoftEmail", "Outlook Mail", [
    "outlook",
    "outlook mail",
    "microsoft email",
    "microsoft mail",
  ]),
  integration("microsoftCalendar", "Microsoft Calendar", [
    "microsoft calendar",
    "microsoftcalendar",
    "outlook calendar",
  ]),
] as const

export type AutomationSurfaceAccess = (typeof automationSurfaceAccesses)[number]
export type AutomationSurfaceIntegration =
  (typeof automationSurfaceIntegrations)[number]["integration"]
export type AutomationSurfaceIntegrationMeta =
  (typeof automationSurfaceIntegrations)[number]

export type AutomationSurfaceFormValue = {
  integration: AutomationSurfaceIntegration
  tools: string[]
}

export function getAutomationSurfaceIntegration(
  integration: AutomationSurfaceIntegration
) {
  return automationSurfaceIntegrations.find(
    (item) => item.integration === integration
  )
}

export function isAutomationSurfaceIntegration(
  integration: unknown
): integration is AutomationSurfaceIntegration {
  return (
    typeof integration === "string" &&
    automationSurfaceIntegrations.some(
      (item) => item.integration === integration
    )
  )
}

export function getAutomationSurfaceLabel(
  integration: AutomationSurfaceIntegration
) {
  return getAutomationSurfaceIntegration(integration)?.label ?? integration
}

export function getAutomationSurfaceLogo(
  integration: AutomationSurfaceIntegration
) {
  return `/logos/integrations/${integrationLogoName(integration)}.svg`
}

function integration<const Integration extends string>(
  integration: Integration,
  label: string,
  aliases: readonly string[]
) {
  return { aliases, integration, label }
}

function integrationLogoName(integration: AutomationSurfaceIntegration) {
  if (integration === "googleCalendar") {
    return "google-calendar"
  }

  if (integration === "googleDrive") {
    return "google-drive"
  }

  if (integration === "microsoftCalendar") {
    return "microsoft-calendar"
  }

  if (integration === "microsoftEmail") {
    return "microsoft-email"
  }

  return integration
}
