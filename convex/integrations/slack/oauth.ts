import { type Doc } from "../../_generated/dataModel"
import { requireEnvironmentVariable } from "../../shared/environment"
import { fetchFormToken } from "../connect/oauth"
import { isAlreadyRevoked, postForm } from "../revoke/oauth"
import {
  slackAppsUninstallUrl,
  slackAuthRevokeUrl,
  slackOAuthAccessUrl,
} from "./config"
import { requireSlackCredentials } from "./credentials"

const slackTokenFallbackErrors = new Set([
  "account_inactive",
  "invalid_auth",
  "no_permission",
  "not_allowed_token_type",
  "token_revoked",
])

type SlackResponse = {
  ok: boolean
  error?: string
  revoked?: boolean
}

// With token rotation on, oauth.v2.access returns an expiring access token and
// a single-use refresh token for the bot and the authed user separately. Both
// are optional on the wire so a response missing them fails at the install
// site with a clear message rather than silently storing half a credential.
export type SlackTokenResponse =
  | {
      ok: true
      access_token: string
      refresh_token?: string
      expires_in?: number
      bot_user_id?: string
      scope?: string
      authed_user?: {
        id?: string
        access_token?: string
        refresh_token?: string
        expires_in?: number
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

/** A rotation exchange answers with one flat pair, whichever token was sent. */
export type SlackRefreshResponse =
  | {
      ok: true
      access_token: string
      refresh_token: string
      expires_in: number
      scope?: string
      token_type?: string
    }
  | {
      ok: false
      error?: string
    }

// A refresh token is spent on use and cannot be retried; these errors mean the
// grant itself is gone, so the integration needs reconnecting rather than
// another attempt.
const slackDeadGrantErrors = new Set([
  "account_inactive",
  "invalid_auth",
  "invalid_grant",
  "invalid_refresh_token",
  "token_expired",
  "token_revoked",
])

export function slackGrantIsDead(error: string | undefined) {
  return error !== undefined && slackDeadGrantErrors.has(error)
}

export function requireSlackClientId() {
  return requireEnvironmentVariable("SLACK_CLIENT_ID")
}

export function requireSlackClientSecret() {
  return requireEnvironmentVariable("SLACK_CLIENT_SECRET")
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

/** Spends a refresh token for a fresh access token and its replacement. */
export async function refreshSlackAccessToken(refreshToken: string) {
  return await fetchFormToken<SlackRefreshResponse>(slackOAuthAccessUrl, {
    client_id: requireSlackClientId(),
    client_secret: requireSlackClientSecret(),
    grant_type: "refresh_token",
    refresh_token: refreshToken,
  })
}

export async function revokeSlackIntegration(integration: Doc<"integrations">) {
  const credentials = requireSlackCredentials(integration)
  const result = await callSlackForm(
    slackAppsUninstallUrl,
    credentials.bot.access,
    {
      client_id: requireSlackClientId(),
      client_secret: requireSlackClientSecret(),
    }
  )

  if (result.ok) {
    return
  }

  if (
    result.error === undefined ||
    !slackTokenFallbackErrors.has(result.error)
  ) {
    throw new Error(`Slack disconnect failed: ${result.error ?? "unknown"}`)
  }

  await revokeSlackToken(credentials.bot.access)
  await revokeSlackToken(credentials.user.access)
}

async function revokeSlackToken(token: string) {
  const result = await callSlackAuthRevoke(token)

  if (result.ok || isAlreadyRevoked(result)) {
    return
  }

  throw new Error(`Slack token revocation failed: ${result.error ?? "unknown"}`)
}

async function callSlackForm(
  url: string,
  token: string,
  body: Record<string, string>
) {
  const response = await postForm(url, body, {
    authorization: `Bearer ${token}`,
  })

  return (await response.json()) as SlackResponse
}

async function callSlackAuthRevoke(token: string) {
  const response = await fetch(slackAuthRevokeUrl, {
    headers: {
      authorization: `Bearer ${token}`,
    },
  })

  return (await response.json()) as SlackResponse
}
