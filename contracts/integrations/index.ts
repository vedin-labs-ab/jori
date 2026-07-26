export const integrations = [
  "slack",
  "linear",
  "github",
  "gmail",
  "googleCalendar",
  "notion",
  "microsoftEmail",
  "microsoftCalendar",
] as const

export const toolSurfaces = ["jori", ...integrations] as const

// Integrations that carry conversations: they record messages and reactions
// and can host an active run surface.
export const messageIntegrations = ["github", "linear", "slack"] as const

export type Integration = (typeof integrations)[number]
export type ToolSurface = (typeof toolSurfaces)[number]
export type MessageIntegration = (typeof messageIntegrations)[number]

export function isMessageIntegration(
  value: string
): value is MessageIntegration {
  return messageIntegrations.some((integration) => integration === value)
}

export const integrationProviders = {
  slack: "slack",
  linear: "linear",
  github: "github",
  gmail: "google",
  googleCalendar: "google",
  notion: "notion",
  microsoftEmail: "microsoft",
  microsoftCalendar: "microsoft",
} as const satisfies Record<Integration, string>

export type Provider = (typeof integrationProviders)[Integration]

export const integrationLabels = {
  slack: "Slack",
  linear: "Linear",
  github: "GitHub",
  gmail: "Gmail",
  googleCalendar: "Google Calendar",
  notion: "Notion",
  microsoftEmail: "Outlook Mail",
  microsoftCalendar: "Microsoft Calendar",
} satisfies Record<Integration, string>

const toolSurfaceLabels = {
  jori: "Jori",
  ...integrationLabels,
} satisfies Record<ToolSurface, string>

export function integrationLabel(integration: string | undefined) {
  if (integration === undefined) {
    return "Unknown integration"
  }

  return integrationLabels[integration as Integration] ?? integration
}

export function toolSurfaceLabel(surface: string | undefined) {
  if (surface === undefined) {
    return "Jori"
  }

  return toolSurfaceLabels[surface as ToolSurface] ?? surface
}

export function providerForIntegration(integration: Integration) {
  return integrationProviders[integration]
}

export function isGoogleIntegration(integration: Integration) {
  return providerForIntegration(integration) === "google"
}

export function isMicrosoftIntegration(integration: Integration) {
  return providerForIntegration(integration) === "microsoft"
}

export function isUserScopedIntegration(integration: Integration) {
  return (
    integration === "gmail" ||
    integration === "googleCalendar" ||
    integration === "microsoftCalendar" ||
    integration === "microsoftEmail"
  )
}
