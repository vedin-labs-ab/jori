import { internal } from "../../_generated/api"
import { type ActionCtx } from "../../_generated/server"
import { completeOAuthInstallation } from "../connect/callback"
import { oauthAuthorizeRedirect, readOAuthCallback } from "../connect/http"
import {
  type MicrosoftIntegration,
  microsoftIntegrationConfigs,
  microsoftOAuthAuthorizeUrl,
} from "./config"
import {
  exchangeMicrosoftAuthorizationCode,
  fetchMicrosoftInstallationProfile,
  requireMicrosoftClientId,
} from "./oauth"
import { parseSignedMicrosoftState } from "./signing"

export async function handleMicrosoftInstall(
  request: Request,
  integration: MicrosoftIntegration
) {
  const config = microsoftIntegrationConfigs[integration]

  return oauthAuthorizeRedirect(request, {
    authorizeUrl: microsoftOAuthAuthorizeUrl("organizations"),
    callbackPath: config.callbackPath,
    clientId: requireMicrosoftClientId(),
    params: {
      response_type: "code",
      scope: config.scopes.join(" "),
      prompt: "consent",
    },
  })
}

export async function handleMicrosoftOAuthCallback(
  ctx: ActionCtx,
  request: Request,
  integration: MicrosoftIntegration
) {
  const config = microsoftIntegrationConfigs[integration]
  const callback = await readOAuthCallback(ctx, request, {
    parse: parseSignedMicrosoftState,
    label: "Microsoft OAuth",
  })

  if (!callback.ok) {
    return callback.response
  }

  const { code, requestUrl, state } = callback

  if (state.integration !== integration) {
    return new Response("Mismatched Microsoft OAuth state", { status: 400 })
  }

  const tokenResult = await exchangeMicrosoftAuthorizationCode({
    code,
    redirectUri: `${requestUrl.origin}${config.callbackPath}`,
  })

  return await completeOAuthInstallation(ctx, {
    state,
    integration,
    tokenResult,
    profile: (accessToken) =>
      fetchMicrosoftInstallationProfile({ accessToken }),
    record: (credentials, profile) =>
      ctx.runMutation(
        internal.integrations.microsoft.install.recordOAuthInstallation,
        {
          integration,
          organizationId: state.organizationId,
          createdBy: state.createdBy,
          microsoftTenantId: profile.tenant.id,
          ...credentials,
          profile,
        }
      ),
  })
}
