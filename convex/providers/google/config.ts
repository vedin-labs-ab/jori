export const googleOAuthAuthorizeUrl =
  "https://accounts.google.com/o/oauth2/v2/auth"
export const googleOAuthTokenUrl = "https://oauth2.googleapis.com/token"
export const googleUserInfoUrl =
  "https://openidconnect.googleapis.com/v1/userinfo"
export const googleOAuthCallbackPath = "/google/oauth/callback"

const googleIdentityScopes = ["openid", "email", "profile"]

export type GoogleSurfaceProvider = "gmail" | "googleCalendar"

export type GoogleSurfaceConfig = {
  callbackParam: GoogleSurfaceProvider
  callbackPath: string
  installPath: string
  provider: GoogleSurfaceProvider
  scopes: string[]
}

export const googleSurfaceConfigs = {
  gmail: {
    callbackParam: "gmail",
    callbackPath: googleOAuthCallbackPath,
    installPath: "/gmail/install",
    provider: "gmail",
    scopes: [
      ...googleIdentityScopes,
      "https://www.googleapis.com/auth/gmail.readonly",
      "https://www.googleapis.com/auth/gmail.send",
    ],
  },
  googleCalendar: {
    callbackParam: "googleCalendar",
    callbackPath: googleOAuthCallbackPath,
    installPath: "/google-calendar/install",
    provider: "googleCalendar",
    scopes: [
      ...googleIdentityScopes,
      "https://www.googleapis.com/auth/calendar.events",
    ],
  },
} satisfies Record<GoogleSurfaceProvider, GoogleSurfaceConfig>
