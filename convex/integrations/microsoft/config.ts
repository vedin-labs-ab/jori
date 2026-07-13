export const microsoftGraphUrl = "https://graph.microsoft.com/v1.0"

const microsoftIdentityScopes = ["offline_access", "User.Read"]

export type MicrosoftIntegration = "microsoftCalendar" | "microsoftEmail"

export type MicrosoftIntegrationConfig = {
  callbackParam: MicrosoftIntegration
  callbackPath: string
  installPath: string
  integration: MicrosoftIntegration
  scopes: string[]
}

export const microsoftIntegrationConfigs = {
  microsoftEmail: {
    callbackParam: "microsoftEmail",
    callbackPath: "/microsoft-email/oauth/callback",
    installPath: "/microsoft-email/install",
    integration: "microsoftEmail",
    scopes: [...microsoftIdentityScopes, "Mail.ReadWrite", "Mail.Send"],
  },
  microsoftCalendar: {
    callbackParam: "microsoftCalendar",
    callbackPath: "/microsoft-calendar/oauth/callback",
    installPath: "/microsoft-calendar/install",
    integration: "microsoftCalendar",
    scopes: [...microsoftIdentityScopes, "Calendars.ReadWrite"],
  },
} satisfies Record<MicrosoftIntegration, MicrosoftIntegrationConfig>

export function microsoftOAuthAuthorizeUrl(tenantId: string) {
  return `https://login.microsoftonline.com/${encodeURIComponent(
    tenantId
  )}/oauth2/v2.0/authorize`
}

export function microsoftOAuthTokenUrl(tenantId: string) {
  return `https://login.microsoftonline.com/${encodeURIComponent(
    tenantId
  )}/oauth2/v2.0/token`
}
