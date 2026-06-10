import { internal } from "../_generated/api"
import { type ActionCtx } from "../_generated/server"
import { createGitHubInstallationToken } from "../providers/github/app"
import { requireGitHubCredentials } from "../providers/github/credentials"
import { requireGoogleCredentials } from "../providers/google/credentials"
import {
  getGoogleTokenScope,
  refreshGoogleAccessToken,
} from "../providers/google/oauth"
import { requireLinearCredentials } from "../providers/linear/credentials"
import {
  getLinearTokenScope,
  refreshLinearAccessToken,
} from "../providers/linear/oauth"
import { requireMicrosoftCredentials } from "../providers/microsoft/credentials"
import {
  getMicrosoftTokenScope,
  refreshMicrosoftAccessToken,
} from "../providers/microsoft/oauth"
import { type RuntimeIntegration } from "./codex"

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

  if (
    integration.provider === "gmail" ||
    integration.provider === "googleCalendar"
  ) {
    return await prepareGoogleIntegrationForRuntime(ctx, integration)
  }

  if (
    integration.provider === "microsoftCalendar" ||
    integration.provider === "microsoftEmail"
  ) {
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
      token: tokenResult.token,
      expiresAt: Number.isFinite(expiresAt) ? expiresAt : undefined,
    },
  }
}

async function prepareLinearIntegrationForRuntime(
  ctx: ActionCtx,
  integration: RuntimeIntegration
) {
  const credentials = requireLinearCredentials(integration)

  if (credentials.expiresAt > Date.now() + 5 * 60 * 1000) {
    return integration
  }

  const tokenResult = await refreshLinearAccessToken(credentials.refreshToken)

  if ("error" in tokenResult) {
    throw new Error(
      `Linear token refresh failed: ${
        tokenResult.error_description ?? tokenResult.error
      }`
    )
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

  return {
    ...integration,
    credentials: refreshedCredentials,
  }
}

async function prepareGoogleIntegrationForRuntime(
  ctx: ActionCtx,
  integration: RuntimeIntegration
) {
  const credentials = requireGoogleCredentials(integration)

  if (credentials.expiresAt > Date.now() + 5 * 60 * 1000) {
    return integration
  }

  const tokenResult = await refreshGoogleAccessToken(credentials.refreshToken)

  if ("error" in tokenResult) {
    throw new Error(
      `Google Workspace token refresh failed: ${
        tokenResult.error_description ?? tokenResult.error
      }`
    )
  }

  const refreshedCredentials = await ctx.runMutation(
    internal.providers.google.install.updateOAuthCredentials,
    {
      integrationId: integration._id,
      accessToken: tokenResult.access_token,
      refreshToken: tokenResult.refresh_token,
      expiresAt: Date.now() + tokenResult.expires_in * 1000,
      scope: getGoogleTokenScope(tokenResult.scope),
    }
  )

  return {
    ...integration,
    credentials: refreshedCredentials,
  }
}

async function prepareMicrosoftIntegrationForRuntime(
  ctx: ActionCtx,
  integration: RuntimeIntegration
) {
  const credentials = requireMicrosoftCredentials(integration)

  if (credentials.expiresAt > Date.now() + 5 * 60 * 1000) {
    return integration
  }

  const tokenResult = await refreshMicrosoftAccessToken({
    refreshToken: credentials.refreshToken,
    tenantId: credentials.tenantId,
  })

  if ("error" in tokenResult || tokenResult.refresh_token === undefined) {
    throw new Error(
      `Microsoft token refresh failed: ${
        "error" in tokenResult
          ? (tokenResult.error_description ?? tokenResult.error)
          : "missing refresh token"
      }`
    )
  }

  const refreshedCredentials = await ctx.runMutation(
    internal.providers.microsoft.install.updateOAuthCredentials,
    {
      integrationId: integration._id,
      accessToken: tokenResult.access_token,
      refreshToken: tokenResult.refresh_token,
      expiresAt: Date.now() + tokenResult.expires_in * 1000,
      scope: getMicrosoftTokenScope(tokenResult.scope),
    }
  )

  return {
    ...integration,
    credentials: refreshedCredentials,
  }
}
