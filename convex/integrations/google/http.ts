import { internal } from "../../_generated/api"
import { type ActionCtx } from "../../_generated/server"
import { completeOAuthInstallation } from "../connect/callback"
import { oauthAuthorizeRedirect, readOAuthCallback } from "../connect/http"
import {
  type GoogleIntegration,
  googleIntegrationConfigs,
  googleOAuthAuthorizeUrl,
} from "./config"
import {
  exchangeGoogleAuthorizationCode,
  fetchGoogleInstallationProfile,
  requireGoogleClientId,
} from "./oauth"
import { parseSignedGoogleState } from "./signing"

export async function handleGoogleInstall(
  request: Request,
  integration: GoogleIntegration
) {
  const config = googleIntegrationConfigs[integration]

  return oauthAuthorizeRedirect(request, {
    authorizeUrl: googleOAuthAuthorizeUrl,
    callbackPath: config.callbackPath,
    clientId: requireGoogleClientId(),
    params: {
      response_type: "code",
      scope: config.scopes.join(" "),
      access_type: "offline",
      prompt: "consent",
    },
  })
}

export async function handleGoogleOAuthCallback(
  ctx: ActionCtx,
  request: Request
) {
  const callback = await readOAuthCallback(ctx, request, {
    parse: parseSignedGoogleState,
    label: "Google Workspace OAuth",
  })

  if (!callback.ok) {
    return callback.response
  }

  const { code, requestUrl, state } = callback

  const integration = state.integration
  const config = googleIntegrationConfigs[integration]

  const tokenResult = await exchangeGoogleAuthorizationCode({
    code,
    redirectUri: `${requestUrl.origin}${config.callbackPath}`,
  })

  return await completeOAuthInstallation(ctx, {
    state,
    integration,
    tokenResult,
    profile: fetchGoogleInstallationProfile,
    record: (credentials, profile) =>
      ctx.runMutation(
        internal.integrations.google.install.recordOAuthInstallation,
        {
          integration,
          organizationId: state.organizationId,
          createdBy: state.createdBy,
          ...credentials,
          profile,
        }
      ),
  })
}
