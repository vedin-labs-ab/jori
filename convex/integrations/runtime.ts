import { internal } from "../_generated/api"
import { type Doc } from "../_generated/dataModel"
import { type ActionCtx } from "../_generated/server"
import { createGitHubInstallationToken } from "../providers/github/app"
import { requireGitHubCredentials } from "../providers/github/credentials"
import { requireGoogleCredentials } from "../providers/google/credentials"
import { refreshGoogleAccessToken } from "../providers/google/oauth"
import { requireLinearCredentials } from "../providers/linear/credentials"
import {
  getLinearTokenScope,
  refreshLinearAccessToken,
} from "../providers/linear/oauth"
import { requireMicrosoftCredentials } from "../providers/microsoft/credentials"
import { refreshMicrosoftAccessToken } from "../providers/microsoft/oauth"
import {
  integrationLabel,
  isGoogleIntegration,
  isMicrosoftIntegration,
} from "../shared/integrations"

type RuntimeIntegration = Doc<"integrations">

const TOKEN_REFRESH_BUFFER_MS = 5 * 60 * 1000

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
    internal.providers.github.install.updateInstallationCredentials,
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
    internal.providers.linear.install.updateOAuthCredentials,
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
    internal.providers.google.install.updateOAuthCredentials,
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
    internal.providers.microsoft.install.updateOAuthCredentials,
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

function hasFreshOAuthToken(credentials: { expiresAt: number }) {
  return hasFreshTokenExpiration(credentials.expiresAt)
}

function hasFreshTokenExpiration(expiresAt: number) {
  return expiresAt > Date.now() + TOKEN_REFRESH_BUFFER_MS
}

// OAuth providers signal a permanently dead grant (revoked consent, expired
// refresh token) with "invalid_grant"; only a full reconnect recovers from it.
async function failOAuthRefresh(
  ctx: ActionCtx,
  integration: RuntimeIntegration,
  platform: string,
  result: { error: string; error_description?: string }
): Promise<never> {
  if (result.error !== "invalid_grant") {
    throw tokenRefreshError(platform, result)
  }

  await ctx.runMutation(internal.integrations.expire.markExpired, {
    integrationId: integration._id,
  })

  throw new Error(
    `${integrationLabel(integration.integration)} access has expired and needs to be reconnected.`
  )
}

function tokenRefreshError(
  platform: string,
  result: { error: string; error_description?: string }
) {
  return new Error(
    `${platform} token refresh failed: ${result.error_description ?? result.error}`
  )
}

function withCredentials(
  integration: RuntimeIntegration,
  credentials: RuntimeIntegration["credentials"]
): RuntimeIntegration {
  return {
    ...integration,
    credentials,
  }
}
