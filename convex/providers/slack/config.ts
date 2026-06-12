export const slackOAuthAuthorizeUrl = "https://slack.com/oauth/v2/authorize"
export const slackOAuthAccessUrl = "https://slack.com/api/oauth.v2.access"
export const slackAppsUninstallUrl = "https://slack.com/api/apps.uninstall"
export const slackAuthRevokeUrl = "https://slack.com/api/auth.revoke"
export const slackOAuthCallbackPath = "/slack/oauth/callback"

export const slackBotScopes = ["app_mentions:read", "chat:write", "files:write"]

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

export const slackInstallUserScopes = [...slackUserScopes, "users:read.email"]
