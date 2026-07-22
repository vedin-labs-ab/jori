export const microsoftGraphUrl = "https://graph.microsoft.com/v1.0"

const microsoftIdentityScopes = ["offline_access", "User.Read"]

export type MicrosoftIntegration = "microsoftCalendar" | "microsoftEmail"

type MicrosoftIntegrationConfig = {
  callbackPath: string
  installPath: string
  scopes: string[]
}

export const microsoftIntegrationConfigs = {
  microsoftEmail: {
    callbackPath: "/microsoft-email/oauth/callback",
    installPath: "/microsoft-email/install",
    scopes: [...microsoftIdentityScopes, "Mail.ReadWrite", "Mail.Send"],
  },
  microsoftCalendar: {
    callbackPath: "/microsoft-calendar/oauth/callback",
    installPath: "/microsoft-calendar/install",
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
