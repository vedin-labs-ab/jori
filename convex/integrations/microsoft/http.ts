import { internal } from "../../_generated/api"
import { type ActionCtx } from "../../_generated/server"
import {
  oauthAuthorizeRedirect,
  readOAuthCallback,
  redirectWithStatus,
} from "../connect/http"
import {
  completeIntegrationOffer,
  failOfferAndRedirect,
} from "../connect/install"
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
import {
  type MicrosoftInstallState,
  parseSignedMicrosoftState,
} from "./signing"

export async function handleMicrosoftInstall(
  request: Request,
  integration: MicrosoftIntegration
) {
  const surface = microsoftIntegrationConfigs[integration]

  return oauthAuthorizeRedirect(request, {
    authorizeUrl: microsoftOAuthAuthorizeUrl("organizations"),
    callbackPath: surface.callbackPath,
    clientId: requireMicrosoftClientId(),
    params: {
      response_type: "code",
      scope: surface.scopes.join(" "),
      prompt: "consent",
    },
  })
}

export async function handleMicrosoftOAuthCallback(
  ctx: ActionCtx,
  request: Request,
  integration: MicrosoftIntegration
) {
  const surface = microsoftIntegrationConfigs[integration]
  const callback = await readOAuthCallback(request, {
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
    redirectUri: `${requestUrl.origin}${surface.callbackPath}`,
  })

  if ("error" in tokenResult) {
    return await redirectWithMicrosoftInstallError(ctx, {
      state,
      integration,
      error: `${surface.integration} OAuth token exchange failed.`,
    })
  }

  let profile: Awaited<ReturnType<typeof fetchMicrosoftInstallationProfile>>

  try {
    profile = await fetchMicrosoftInstallationProfile({
      accessToken: tokenResult.access_token,
    })
  } catch {
    return await redirectWithMicrosoftInstallError(ctx, {
      state,
      integration,
      error: `${surface.integration} installation profile could not be loaded.`,
    })
  }

  try {
    await recordMicrosoftInstallation(ctx, {
      integration,
      profile,
      state,
      tokenResult,
    })
  } catch {
    return await redirectWithMicrosoftInstallError(ctx, {
      state,
      integration,
      error: `${surface.integration} installation could not be recorded.`,
    })
  }

  return redirectWithStatus(state.returnUrl, surface.callbackParam, "connected")
}

async function recordMicrosoftInstallation(
  ctx: ActionCtx,
  args: {
    integration: MicrosoftIntegration
    state: MicrosoftInstallState
    tokenResult: {
      access_token: string
      refresh_token?: string
      expires_in: number
      scope?: string
    }
    profile: Awaited<ReturnType<typeof fetchMicrosoftInstallationProfile>>
  }
) {
  const integrationId = await ctx.runMutation(
    internal.integrations.microsoft.install.recordOAuthInstallation,
    {
      integration: args.integration,
      tenantId: args.state.tenantId,
      createdBy: args.state.createdBy,
      microsoftTenantId: args.profile.tenant.id,
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

function redirectWithMicrosoftInstallError(
  ctx: ActionCtx,
  args: {
    state: MicrosoftInstallState
    integration: MicrosoftIntegration
    error: string
  }
) {
  return failOfferAndRedirect(ctx, {
    callbackParam: microsoftIntegrationConfigs[args.integration].callbackParam,
    error: args.error,
    integrationOfferId: args.state.integrationOfferId,
    returnUrl: args.state.returnUrl,
  })
}
