export const providers = [
  "milo",
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

export const integrationProviders = providers.filter(
  (provider) => provider !== "milo"
) as Exclude<Provider, "milo">[]

export type Provider = (typeof providers)[number]
export type IntegrationProvider = Exclude<Provider, "milo">

const providerLabels: Record<Provider, string> = {
  milo: "Milo",
  slack: "Slack",
  linear: "Linear",
  github: "GitHub",
  gmail: "Gmail",
  googleCalendar: "Google Calendar",
  googleDrive: "Google Drive",
  notion: "Notion",
  microsoftEmail: "Outlook Mail",
  microsoftCalendar: "Microsoft Calendar",
}

export function providerLabel(provider: string | undefined) {
  if (provider === undefined) {
    return "Milo"
  }

  return providerLabels[provider as Provider] ?? provider
}

export function isGoogleProvider(provider: IntegrationProvider) {
  return (
    provider === "gmail" ||
    provider === "googleCalendar" ||
    provider === "googleDrive"
  )
}

export function isMicrosoftProvider(provider: IntegrationProvider) {
  return provider === "microsoftCalendar" || provider === "microsoftEmail"
}

export function isUserScopedProvider(provider: IntegrationProvider) {
  return (
    provider === "gmail" ||
    provider === "googleCalendar" ||
    provider === "microsoftCalendar" ||
    provider === "microsoftEmail"
  )
}
