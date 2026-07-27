import { internal } from "../_generated/api"
import { type Doc } from "../_generated/dataModel"
import { type ActionCtx } from "../_generated/server"
import {
  isGoogleIntegration,
  isMicrosoftIntegration,
} from "../shared/integrations"
import { createGitHubInstallationToken } from "./github/app"
import { requireGitHubCredentials } from "./github/credentials"
import { requireGoogleCredentials } from "./google/credentials"
import { refreshGoogleAccessToken } from "./google/oauth"
import { requireLinearCredentials } from "./linear/credentials"
import { getLinearTokenScope, refreshLinearAccessToken } from "./linear/oauth"
import { requireMicrosoftCredentials } from "./microsoft/credentials"
import { refreshMicrosoftAccessToken } from "./microsoft/oauth"
import {
  failOAuthRefresh,
  hasFreshOAuthToken,
  hasFreshTokenExpiration,
  withCredentials,
} from "./refresh"
import {
  requireSlackCredentials,
  type SlackTokenPair,
  slackTokenKinds,
} from "./slack/credentials"
import { refreshSlackAccessToken, slackGrantIsDead } from "./slack/oauth"

type RuntimeIntegration = Doc<"integrations">

export async function prepareIntegrationForRuntime(
  ctx: ActionCtx,
  args: {
    integration: RuntimeIntegration
  }
) {
  const integration = args.integration

  if (integration.integration === "github") {
    return await prepareGitHubIntegrationForRuntime(ctx, integration)
  }

  if (integration.integration === "linear") {
    return await prepareLinearIntegrationForRuntime(ctx, integration)
  }

  if (integration.integration === "slack") {
    return await prepareSlackIntegrationForRuntime(ctx, integration)
  }

  if (isGoogleIntegration(integration.integration)) {
    return await prepareGoogleIntegrationForRuntime(ctx, integration)
  }

  if (isMicrosoftIntegration(integration.integration)) {
    return await prepareMicrosoftIntegrationForRuntime(ctx, integration)
  }

  return integration
}

async function prepareGitHubIntegrationForRuntime(
  ctx: ActionCtx,
  integration: RuntimeIntegration
) {
  const credentials = requireGitHubCredentials(integration)

  if (hasFreshGitHubToken(credentials)) {
    return integration
  }

  const tokenResult = await createGitHubInstallationToken(
    credentials.installationId
  )
  const expiresAt = Date.parse(tokenResult.expires_at)

  if (!Number.isFinite(expiresAt)) {
    throw new Error("GitHub installation token is missing an expiration")
  }

  const refreshedCredentials = await ctx.runMutation(
    internal.integrations.github.install.updateInstallationCredentials,
    {
      integrationId: integration._id,
      accessToken: tokenResult.token,
      expiresAt,
    }
  )

  return withCredentials(integration, refreshedCredentials)
}

async function prepareLinearIntegrationForRuntime(
  ctx: ActionCtx,
  integration: RuntimeIntegration
) {
  const credentials = requireLinearCredentials(integration)

  if (hasFreshOAuthToken(credentials)) {
    return integration
  }

  const tokenResult = await refreshLinearAccessToken(credentials.tokens.refresh)

  if ("error" in tokenResult) {
    return await failOAuthRefresh(ctx, integration, "Linear", tokenResult)
  }

  const refreshedCredentials = await ctx.runMutation(
    internal.integrations.linear.install.updateOAuthCredentials,
    {
      integrationId: integration._id,
      accessToken: tokenResult.access_token,
      refreshToken: tokenResult.refresh_token,
      expiresAt: Date.now() + tokenResult.expires_in * 1000,
      scope: getLinearTokenScope(tokenResult.scope),
    }
  )

  return withCredentials(integration, refreshedCredentials)
}

async function prepareGoogleIntegrationForRuntime(
  ctx: ActionCtx,
  integration: RuntimeIntegration
) {
  const credentials = requireGoogleCredentials(integration)

  if (hasFreshOAuthToken(credentials)) {
    return integration
  }

  const tokenResult = await refreshGoogleAccessToken(credentials.tokens.refresh)

  if ("error" in tokenResult) {
    return await failOAuthRefresh(
      ctx,
      integration,
      "Google Workspace",
      tokenResult
    )
  }

  const refreshedCredentials = await ctx.runMutation(
    internal.integrations.google.install.updateOAuthCredentials,
    {
      integrationId: integration._id,
      accessToken: tokenResult.access_token,
      refreshToken: tokenResult.refresh_token,
      expiresAt: Date.now() + tokenResult.expires_in * 1000,
      scope: tokenResult.scope,
    }
  )

  return withCredentials(integration, refreshedCredentials)
}

async function prepareMicrosoftIntegrationForRuntime(
  ctx: ActionCtx,
  integration: RuntimeIntegration
) {
  const credentials = requireMicrosoftCredentials(integration)

  if (hasFreshOAuthToken(credentials)) {
    return integration
  }

  const tokenResult = await refreshMicrosoftAccessToken({
    refreshToken: credentials.tokens.refresh,
    tenantId: credentials.tenantId,
  })

  if ("error" in tokenResult) {
    return await failOAuthRefresh(ctx, integration, "Microsoft", tokenResult)
  }

  if (tokenResult.refresh_token === undefined) {
    throw new Error("Microsoft token refresh failed: missing refresh token")
  }

  const refreshedCredentials = await ctx.runMutation(
    internal.integrations.microsoft.install.updateOAuthCredentials,
    {
      integrationId: integration._id,
      accessToken: tokenResult.access_token,
      refreshToken: tokenResult.refresh_token,
      expiresAt: Date.now() + tokenResult.expires_in * 1000,
      scope: tokenResult.scope,
    }
  )

  return withCredentials(integration, refreshedCredentials)
}

function hasFreshGitHubToken(credentials: {
  tokens?: {
    access?: string
  }
  expiresAt?: number
}) {
  const accessToken = credentials.tokens?.access

  return (
    accessToken !== undefined &&
    accessToken !== "" &&
    credentials.expiresAt !== undefined &&
    hasFreshTokenExpiration(credentials.expiresAt)
  )
}

/** Slack rotates the bot and user tokens on independent clocks, and each
 *  refresh token is single-use, so only the stale side is exchanged and the
 *  result is written back before the next one is attempted. */
async function prepareSlackIntegrationForRuntime(
  ctx: ActionCtx,
  integration: RuntimeIntegration
) {
  const credentials = requireSlackCredentials(integration)
  const stale = slackTokenKinds.filter(
    (kind) => !hasFreshOAuthToken(credentials[kind])
  )

  if (stale.length === 0) {
    return integration
  }

  const refreshed: { bot?: SlackTokenPair; user?: SlackTokenPair } = {}

  for (const kind of stale) {
    const result = await refreshSlackAccessToken(credentials[kind].refresh)

    if (!result.ok) {
      return await failOAuthRefresh(ctx, integration, "Slack", {
        error: slackGrantIsDead(result.error) ? "invalid_grant" : "slack_error",
        error_description: result.error,
      })
    }

    refreshed[kind] = {
      access: result.access_token,
      refresh: result.refresh_token,
      expiresAt: Date.now() + result.expires_in * 1000,
    }
  }

  const updatedCredentials = await ctx.runMutation(
    internal.integrations.slack.install.updateOAuthCredentials,
    { integrationId: integration._id, ...refreshed }
  )

  return withCredentials(integration, updatedCredentials)
}
