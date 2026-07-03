import { internal } from "../../_generated/api"
import { type ActionCtx } from "../../_generated/server"
import {
  oauthAuthorizeRedirect,
  readOAuthCallback,
  redirectWithStatus,
} from "../http"
import { completeIntegrationOffer, failOfferAndRedirect } from "../install"
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
import { type GoogleInstallState, parseSignedGoogleState } from "./signing"

export async function handleGoogleInstall(
  request: Request,
  integration: GoogleIntegration
) {
  const surface = googleIntegrationConfigs[integration]

  return oauthAuthorizeRedirect(request, {
    authorizeUrl: googleOAuthAuthorizeUrl,
    callbackPath: surface.callbackPath,
    clientId: requireGoogleClientId(),
    params: {
      response_type: "code",
      scope: surface.scopes.join(" "),
      access_type: "offline",
      prompt: "consent",
    },
  })
}

export async function handleGoogleOAuthCallback(
  ctx: ActionCtx,
  request: Request,
  expectedIntegration?: GoogleIntegration
) {
  const callback = await readOAuthCallback(request, {
    parse: parseSignedGoogleState,
    label: "Google Workspace OAuth",
  })

  if (!callback.ok) {
    return callback.response
  }

  const { code, requestUrl, state } = callback

  if (
    expectedIntegration !== undefined &&
    state.integration !== expectedIntegration
  ) {
    return new Response("Mismatched Google Workspace OAuth state", {
      status: 400,
    })
  }

  const integration = state.integration
  const surface = googleIntegrationConfigs[integration]

  const tokenResult = await exchangeGoogleAuthorizationCode({
    code,
    redirectUri: `${requestUrl.origin}${surface.callbackPath}`,
  })

  if ("error" in tokenResult) {
    return await redirectWithGoogleInstallError(ctx, {
      state,
      integration,
      error: `${surface.integration} OAuth token exchange failed.`,
    })
  }

  let profile: Awaited<ReturnType<typeof fetchGoogleInstallationProfile>>

  try {
    profile = await fetchGoogleInstallationProfile(tokenResult.access_token)
  } catch {
    return await redirectWithGoogleInstallError(ctx, {
      state,
      integration,
      error: `${surface.integration} installation profile could not be loaded.`,
    })
  }

  try {
    await recordGoogleInstallation(ctx, {
      integration,
      profile,
      state,
      tokenResult,
    })
  } catch {
    return await redirectWithGoogleInstallError(ctx, {
      state,
      integration,
      error: `${surface.integration} installation could not be recorded.`,
    })
  }

  return redirectWithStatus(state.returnUrl, surface.callbackParam, "connected")
}

async function recordGoogleInstallation(
  ctx: ActionCtx,
  args: {
    integration: GoogleIntegration
    state: GoogleInstallState
    tokenResult: {
      access_token: string
      refresh_token?: string
      expires_in: number
      scope?: string
    }
    profile: Awaited<ReturnType<typeof fetchGoogleInstallationProfile>>
  }
) {
  const integrationId = await ctx.runMutation(
    internal.providers.google.install.recordOAuthInstallation,
    {
      integration: args.integration,
      tenantId: args.state.tenantId,
      createdBy: args.state.createdBy,
      accessToken: args.tokenResult.access_token,
      refreshToken: args.tokenResult.refresh_token,
      expiresAt: Date.now() + args.tokenResult.expires_in * 1000,
      scope: args.tokenResult.scope,
      profile: args.profile,
    }
  )

  await completeIntegrationOffer(ctx, {
    integrationOfferId: args.state.integrationOfferId,
    integrationId,
  })
}

function redirectWithGoogleInstallError(
  ctx: ActionCtx,
  args: {
    state: GoogleInstallState
    integration: GoogleIntegration
    error: string
  }
) {
  return failOfferAndRedirect(ctx, {
    callbackParam: googleIntegrationConfigs[args.integration].callbackParam,
    error: args.error,
    integrationOfferId: args.state.integrationOfferId,
    returnUrl: args.state.returnUrl,
  })
}
