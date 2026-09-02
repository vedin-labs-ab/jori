export const googleOAuthAuthorizeUrl =
  "https://accounts.google.com/o/oauth2/v2/auth"
export const googleOAuthTokenUrl = "https://oauth2.googleapis.com/token"
export const googleOAuthRevokeUrl = "https://oauth2.googleapis.com/revoke"
export const googleUserInfoUrl =
  "https://openidconnect.googleapis.com/v1/userinfo"
const googleOAuthCallbackPath = "/google/oauth/callback"

const googleIdentityScopes = ["openid", "email", "profile"]

export type GoogleIntegration = "gmail" | "googleCalendar"

type GoogleIntegrationConfig = {
  callbackPath: string
  installPath: string
  scopes: string[]
}

export const googleIntegrationConfigs = {
  gmail: {
    callbackPath: googleOAuthCallbackPath,
    installPath: "/gmail/install",
    scopes: [
      ...googleIdentityScopes,
      "https://www.googleapis.com/auth/gmail.readonly",
      "https://www.googleapis.com/auth/gmail.compose",
      "https://www.googleapis.com/auth/gmail.send",
    ],
  },
  googleCalendar: {
    callbackPath: googleOAuthCallbackPath,
    installPath: "/google-calendar/install",
    scopes: [
      ...googleIdentityScopes,
      "https://www.googleapis.com/auth/calendar.events",
      "https://www.googleapis.com/auth/calendar.calendarlist.readonly",
    ],
  },
} satisfies Record<GoogleIntegration, GoogleIntegrationConfig>
