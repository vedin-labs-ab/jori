import { type Doc } from "../_generated/dataModel"
import { deleteGitHubInstallation } from "../providers/github/app"
import { requireGitHubCredentials } from "../providers/github/credentials"
import { googleOAuthRevokeUrl } from "../providers/google/config"
import { requireGoogleCredentials } from "../providers/google/credentials"
import { linearOAuthRevokeUrl } from "../providers/linear/config"
import { requireLinearCredentials } from "../providers/linear/credentials"
import {
  requireLinearClientId,
  requireLinearClientSecret,
} from "../providers/linear/oauth"
import { requireMicrosoftCredentials } from "../providers/microsoft/credentials"
import {
  notionApiVersion,
  notionOAuthRevokeUrl,
} from "../providers/notion/config"
import { requireNotionCredentials } from "../providers/notion/credentials"
import {
  requireNotionClientId,
  requireNotionClientSecret,
} from "../providers/notion/oauth"
import {
  slackAppsUninstallUrl,
  slackAuthRevokeUrl,
} from "../providers/slack/config"
import { requireSlackCredentials } from "../providers/slack/credentials"

const alreadyRevokedErrors = new Set([
  "invalid_auth",
  "invalid_grant",
  "invalid_token",
  "token_revoked",
])

const slackTokenFallbackErrors = new Set([
  "account_inactive",
  "invalid_auth",
  "no_permission",
  "not_allowed_token_type",
  "token_revoked",
])

type OAuthErrorResponse = {
  error?: string
  error_description?: string
  message?: string
}

type SlackResponse = {
  ok: boolean
  error?: string
  revoked?: boolean
}

export async function revokeIntegrationAccess(
  integration: Doc<"integrations">
) {
  switch (integration.provider) {
    case "github":
      await deleteGitHubInstallation(
        requireGitHubCredentials(integration).installationId
      )
      return
    case "gmail":
    case "googleCalendar":
      await revokeGoogleIntegration(integration)
      return
    case "linear":
      await revokeLinearIntegration(integration)
      return
    case "microsoftCalendar":
    case "microsoftEmail":
      revokeMicrosoftIntegration(integration)
      return
    case "notion":
      await revokeNotionIntegration(integration)
      return
    case "slack":
      await revokeSlackIntegration(integration)
      return
  }
}

async function revokeGoogleIntegration(integration: Doc<"integrations">) {
  const credentials = requireGoogleCredentials(integration)
  const response = await postForm(googleOAuthRevokeUrl, {
    token: credentials.refreshToken,
  })

  await expectOAuthRevocationResponse(response, "Google")
}

async function revokeLinearIntegration(integration: Doc<"integrations">) {
  const credentials = requireLinearCredentials(integration)
  const response = await postForm(
    linearOAuthRevokeUrl,
    {
      token: credentials.refreshToken,
      token_type_hint: "refresh_token",
    },
    {
      authorization: `Basic ${encodeBasicCredentials(
        requireLinearClientId(),
        requireLinearClientSecret()
      )}`,
    }
  )

  await expectOAuthRevocationResponse(response, "Linear")
}

function revokeMicrosoftIntegration(integration: Doc<"integrations">) {
  requireMicrosoftCredentials(integration)
}

async function revokeNotionIntegration(integration: Doc<"integrations">) {
  const credentials = requireNotionCredentials(integration)
  const response = await fetch(notionOAuthRevokeUrl, {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
      "notion-version": notionApiVersion,
    },
    body: JSON.stringify({
      client_id: requireNotionClientId(),
      client_secret: requireNotionClientSecret(),
      token: credentials.accessToken,
    }),
  })

  await expectOAuthRevocationResponse(response, "Notion")
}

async function revokeSlackIntegration(integration: Doc<"integrations">) {
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

async function expectOAuthRevocationResponse(
  response: Response,
  provider: string
) {
  const result = await readOAuthResponse(response)

  if (response.ok || isAlreadyRevoked(result)) {
    return
  }

  throw new Error(
    `${provider} disconnect failed: ${
      result.error_description ??
      result.message ??
      result.error ??
      response.status
    }`
  )
}

function isAlreadyRevoked(result: OAuthErrorResponse | SlackResponse) {
  return result.error !== undefined && alreadyRevokedErrors.has(result.error)
}

async function postForm(
  url: string,
  body: Record<string, string>,
  headers: Record<string, string> = {}
) {
  return await fetch(url, {
    method: "POST",
    headers: {
      ...headers,
      "content-type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams(body),
  })
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

async function readOAuthResponse(response: Response) {
  const body = await response.text()

  if (body === "") {
    return {}
  }

  try {
    return JSON.parse(body) as OAuthErrorResponse
  } catch {
    return { message: body }
  }
}

function requireSlackClientId() {
  const clientId = process.env.SLACK_CLIENT_ID

  if (clientId === undefined || clientId === "") {
    throw new Error("Missing SLACK_CLIENT_ID")
  }

  return clientId
}

function requireSlackClientSecret() {
  const clientSecret = process.env.SLACK_CLIENT_SECRET

  if (clientSecret === undefined || clientSecret === "") {
    throw new Error("Missing SLACK_CLIENT_SECRET")
  }

  return clientSecret
}

function encodeBasicCredentials(clientId: string, clientSecret: string) {
  return btoa(`${clientId}:${clientSecret}`)
}
