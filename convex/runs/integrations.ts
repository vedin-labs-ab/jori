import { internal } from "../_generated/api"
import { type ActionCtx } from "../_generated/server"
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
import { type CodexRuntimeInput } from "./codex"

export async function prepareIntegrationForRuntime(
  ctx: ActionCtx,
  integration: CodexRuntimeInput["integration"]
) {
  if (integration.provider === "linear") {
    return await prepareLinearIntegrationForRuntime(ctx, integration)
  }

  if (integration.provider === "microsoft") {
    return await prepareMicrosoftIntegrationForRuntime(ctx, integration)
  }

  return integration
}

async function prepareLinearIntegrationForRuntime(
  ctx: ActionCtx,
  integration: CodexRuntimeInput["integration"]
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

async function prepareMicrosoftIntegrationForRuntime(
  ctx: ActionCtx,
  integration: CodexRuntimeInput["integration"]
) {
  const credentials = requireMicrosoftCredentials(integration)

  if (credentials.expiresAt > Date.now() + 5 * 60 * 1000) {
    return integration
  }

  const tokenResult = await refreshMicrosoftAccessToken({
    refreshToken: credentials.refreshToken,
    tenantId: integration.accountId,
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
