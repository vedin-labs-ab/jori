import { type Provider } from "../providers"

export const integrations = [
  "slack",
  "linear",
  "github",
  "gmail",
  "googleCalendar",
  "googleDrive",
  "notion",
  "microsoftEmail",
  "microsoftCalendar",
] as const

export const toolSurfaces = ["milo", ...integrations] as const

export type Integration = (typeof integrations)[number]
export type ToolSurface = (typeof toolSurfaces)[number]

export const integrationProviders = {
  slack: "slack",
  linear: "linear",
  github: "github",
  gmail: "google",
  googleCalendar: "google",
  googleDrive: "google",
  notion: "notion",
  microsoftEmail: "microsoft",
  microsoftCalendar: "microsoft",
} satisfies Record<Integration, Provider>

export const integrationLabels = {
  slack: "Slack",
  linear: "Linear",
  github: "GitHub",
  gmail: "Gmail",
  googleCalendar: "Google Calendar",
  googleDrive: "Google Drive",
  notion: "Notion",
  microsoftEmail: "Outlook Mail",
  microsoftCalendar: "Microsoft Calendar",
} satisfies Record<Integration, string>

const toolSurfaceLabels = {
  milo: "Milo",
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
    return "Milo"
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
