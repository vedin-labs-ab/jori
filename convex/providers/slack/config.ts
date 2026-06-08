export const slackOAuthAuthorizeUrl = "https://slack.com/oauth/v2/authorize"
export const slackOAuthAccessUrl = "https://slack.com/api/oauth.v2.access"
export const slackOAuthCallbackPath = "/slack/oauth/callback"

export const slackBotScopes = ["app_mentions:read", "chat:write"]

export const slackUserScopes = [
  "channels:history",
  "channels:read",
  "groups:history",
  "groups:read",
  "im:history",
  "im:read",
  "mpim:history",
  "mpim:read",
  "search:read",
  "users:read",
]
