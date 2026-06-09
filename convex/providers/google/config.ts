export const googleOAuthAuthorizeUrl =
  "https://accounts.google.com/o/oauth2/v2/auth"
export const googleOAuthTokenUrl = "https://oauth2.googleapis.com/token"
export const googleUserInfoUrl =
  "https://openidconnect.googleapis.com/v1/userinfo"
export const googleOAuthCallbackPath = "/google/oauth/callback"

export const googleOAuthScopes = [
  "openid",
  "email",
  "profile",
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/gmail.send",
  "https://www.googleapis.com/auth/calendar.events",
]
