import { fetchFormToken, requireProviderEnv } from "../oauth"
import { slackOAuthAccessUrl } from "./config"

export type SlackTokenResponse =
  | {
      ok: true
      access_token: string
      bot_user_id?: string
      scope?: string
      authed_user?: {
        access_token?: string
        scope?: string
      }
      team: {
        id: string
        name?: string
      }
    }
  | {
      ok: false
      error?: string
    }

export function requireSlackClientId() {
  return requireProviderEnv("SLACK_CLIENT_ID")
}

export function requireSlackClientSecret() {
  return requireProviderEnv("SLACK_CLIENT_SECRET")
}

export async function exchangeSlackAuthorizationCode(args: {
  code: string
  redirectUri: string
}) {
  return await fetchFormToken<SlackTokenResponse>(slackOAuthAccessUrl, {
    client_id: requireSlackClientId(),
    client_secret: requireSlackClientSecret(),
    code: args.code,
    redirect_uri: args.redirectUri,
  })
}
