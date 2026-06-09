export const microsoftGraphUrl = "https://graph.microsoft.com/v1.0"
export const microsoftOAuthCallbackPath = "/microsoft/oauth/callback"
export const microsoftAdminConsentCallbackPath = "/microsoft/admin/callback"

export const microsoftDelegatedScopes = [
  "offline_access",
  "User.Read",
  "Chat.Read",
  "Chat.ReadWrite",
  "ChatMessage.Send",
  "Channel.ReadBasic.All",
  "ChannelMessage.Read.All",
  "ChannelMessage.Send",
  "Team.ReadBasic.All",
  "Calendars.Read",
  "Mail.Read",
  "Files.Read.All",
]

export function microsoftAdminConsentUrl() {
  return "https://login.microsoftonline.com/organizations/v2.0/adminconsent"
}

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
