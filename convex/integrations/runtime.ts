import { internal } from "../_generated/api"
import { type Doc } from "../_generated/dataModel"
import { type ActionCtx } from "../_generated/server"
import { isGoogleProvider, isMicrosoftProvider } from "../providers/catalog"
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

type RuntimeIntegration = Doc<"integrations">

const OAUTH_REFRESH_BUFFER_MS = 5 * 60 * 1000

export async function prepareIntegrationForRuntime(
  ctx: ActionCtx,
  args: {
    integration: RuntimeIntegration
  }
) {
  const integration = args.integration

  if (integration.provider === "github") {
    return await prepareGitHubIntegrationForRuntime(integration)
  }

  if (integration.provider === "linear") {
    return await prepareLinearIntegrationForRuntime(ctx, integration)
  }

  if (isGoogleProvider(integration.provider)) {
    return await prepareGoogleIntegrationForRuntime(ctx, integration)
  }

  if (isMicrosoftProvider(integration.provider)) {
    return await prepareMicrosoftIntegrationForRuntime(ctx, integration)
  }

  return integration
}

async function prepareGitHubIntegrationForRuntime(
  integration: RuntimeIntegration
) {
  const credentials = requireGitHubCredentials(integration)
  const tokenResult = await createGitHubInstallationToken(
    credentials.installationId
  )
  const expiresAt = Date.parse(tokenResult.expires_at)

  return {
    ...integration,
    credentials: {
      installationId: credentials.installationId,
      tokens: { access: tokenResult.token },
      expiresAt: Number.isFinite(expiresAt) ? expiresAt : undefined,
    },
  }
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
    throw tokenRefreshError("Linear", tokenResult)
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
    throw tokenRefreshError("Google Workspace", tokenResult)
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
    throw tokenRefreshError("Microsoft", tokenResult)
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

function hasFreshOAuthToken(credentials: { expiresAt: number }) {
  return credentials.expiresAt > Date.now() + OAUTH_REFRESH_BUFFER_MS
}

function tokenRefreshError(
  provider: string,
  result: { error: string; error_description?: string }
) {
  return new Error(
    `${provider} token refresh failed: ${result.error_description ?? result.error}`
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
