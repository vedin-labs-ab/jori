import { internal } from "../_generated/api"
import { type Doc } from "../_generated/dataModel"
import { type ActionCtx } from "../_generated/server"
import {
  isGoogleIntegration,
  isMicrosoftIntegration,
} from "../shared/integrations"
import { credentialSnapshot } from "./connect/snapshot"
import { createGitHubInstallationToken } from "./github/app"
import { requireGitHubCredentials } from "./github/credentials"
import { requireGoogleCredentials } from "./google/credentials"
import { refreshGoogleAccessToken } from "./google/oauth"
import { requireLinearCredentials } from "./linear/credentials"
import { getLinearTokenScope, refreshLinearAccessToken } from "./linear/oauth"
import { requireMicrosoftCredentials } from "./microsoft/credentials"
import { refreshMicrosoftAccessToken } from "./microsoft/oauth"
import {
  hasFreshTokenExpiration,
  refreshOAuthIntegration,
  withCredentials,
} from "./refresh"
import { prepareSlackIntegrationForRuntime } from "./slack/install"

type RuntimeIntegration = Doc<"integrations">

export async function prepareIntegrationForRuntime(
  ctx: ActionCtx,
  { integration }: { integration: RuntimeIntegration }
) {
  if (integration.integration === "github") {
    return await prepareGitHubIntegrationForRuntime(ctx, integration)
  }

  if (integration.integration === "linear") {
    const credentials = requireLinearCredentials(integration)

    return await refreshOAuthIntegration(ctx, integration, {
      expiresAt: credentials.expiresAt,
      label: "Linear",
      refresh: () => refreshLinearAccessToken(credentials.tokens.refresh),
      save: (token, update) =>
        ctx.runMutation(
          internal.integrations.linear.install.updateOAuthCredentials,
          {
            ...update,
            refreshToken: token.refresh_token,
            scope: getLinearTokenScope(token.scope),
          }
        ),
    })
  }

  if (integration.integration === "slack") {
    return await prepareSlackIntegrationForRuntime(ctx, integration)
  }

  if (isGoogleIntegration(integration.integration)) {
    const credentials = requireGoogleCredentials(integration)

    return await refreshOAuthIntegration(ctx, integration, {
      expiresAt: credentials.expiresAt,
      label: "Google Workspace",
      refresh: () => refreshGoogleAccessToken(credentials.tokens.refresh),
      save: (token, update) =>
        ctx.runMutation(
          internal.integrations.google.install.updateOAuthCredentials,
          {
            ...update,
            refreshToken: token.refresh_token,
            scope: token.scope,
          }
        ),
    })
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
      expectedSnapshot: credentialSnapshot(integration),
      accessToken: tokenResult.token,
      expiresAt,
    }
  )

  return withCredentials(integration, refreshedCredentials)
}

async function prepareMicrosoftIntegrationForRuntime(
  ctx: ActionCtx,
  integration: RuntimeIntegration
) {
  const credentials = requireMicrosoftCredentials(integration)

  return await refreshOAuthIntegration(ctx, integration, {
    expiresAt: credentials.expiresAt,
    label: "Microsoft",
    refresh: () =>
      refreshMicrosoftAccessToken({
        refreshToken: credentials.tokens.refresh,
        tenantId: credentials.tenantId,
      }),
    save: async (token, update) => {
      if (token.refresh_token === undefined) {
        throw new Error("Microsoft token refresh failed: missing refresh token")
      }

      return await ctx.runMutation(
        internal.integrations.microsoft.install.updateOAuthCredentials,
        {
          ...update,
          refreshToken: token.refresh_token,
          scope: token.scope,
        }
      )
    },
  })
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
