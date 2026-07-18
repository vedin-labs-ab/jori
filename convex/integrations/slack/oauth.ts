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

export type SlackTokenResponse =
  | {
      ok: true
      access_token: string
      bot_user_id?: string
      scope?: string
      authed_user?: {
        id?: string
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

export async function revokeSlackIntegration(integration: Doc<"integrations">) {
  const credentials = requireSlackCredentials(integration)
  const result = await callSlackForm(slackAppsUninstallUrl, credentials.bot, {
    client_id: requireSlackClientId(),
    client_secret: requireSlackClientSecret(),
  })

  if (result.ok) {
    return
  }

  if (
    result.error === undefined ||
    !slackTokenFallbackErrors.has(result.error)
  ) {
    throw new Error(`Slack disconnect failed: ${result.error ?? "unknown"}`)
  }

  await revokeSlackToken(credentials.bot)
  await revokeSlackToken(credentials.user)
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
