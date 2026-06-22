import { internal } from "../../_generated/api"
import { type ActionCtx } from "../../_generated/server"
import { readCallbackState, redirectWithStatus } from "../http"
import { completeSetupLink, failSetupLink } from "../install"
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
  const requestUrl = new URL(request.url)
  const state = requestUrl.searchParams.get("state")

  if (state === null) {
    return new Response("Missing state", { status: 400 })
  }

  const googleUrl = new URL(googleOAuthAuthorizeUrl)
  googleUrl.searchParams.set("client_id", requireGoogleClientId())
  googleUrl.searchParams.set("response_type", "code")
  googleUrl.searchParams.set("scope", surface.scopes.join(" "))
  googleUrl.searchParams.set("state", state)
  googleUrl.searchParams.set("access_type", "offline")
  googleUrl.searchParams.set("prompt", "consent")
  googleUrl.searchParams.set(
    "redirect_uri",
    `${requestUrl.origin}${surface.callbackPath}`
  )

  return Response.redirect(googleUrl.toString(), 302)
}

export async function handleGoogleOAuthCallback(
  ctx: ActionCtx,
  request: Request,
  expectedIntegration?: GoogleIntegration
) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get("code")
  const stateValue = requestUrl.searchParams.get("state")

  if (code === null || stateValue === null) {
    return new Response("Missing OAuth callback parameters", { status: 400 })
  }

  const parsed = await readCallbackState({
    value: stateValue,
    parse: parseSignedGoogleState,
    label: "Google Workspace OAuth",
  })

  if (!parsed.ok) {
    return parsed.response
  }

  const state = parsed.state

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
    return await redirectWithGoogleSetupError(ctx, {
      state,
      integration,
      error: `${surface.integration} OAuth token exchange failed.`,
    })
  }

  let profile: Awaited<ReturnType<typeof fetchGoogleInstallationProfile>>

  try {
    profile = await fetchGoogleInstallationProfile(tokenResult.access_token)
  } catch {
    return await redirectWithGoogleSetupError(ctx, {
      state,
      integration,
      error: `${surface.integration} installation profile could not be loaded.`,
    })
  }

  try {
    await recordGoogleSetupInstallation(ctx, {
      integration,
      profile,
      state,
      tokenResult,
    })
  } catch {
    return await redirectWithGoogleSetupError(ctx, {
      state,
      integration,
      error: `${surface.integration} installation could not be recorded.`,
    })
  }

  return redirectWithGoogleStatus(state.returnUrl, integration, "connected")
}

async function recordGoogleSetupInstallation(
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

  await completeSetupLink(ctx, {
    setupLinkId: args.state.setupLinkId,
    integrationId,
  })
}

async function redirectWithGoogleSetupError(
  ctx: ActionCtx,
  args: {
    state: GoogleInstallState
    integration: GoogleIntegration
    error: string
  }
) {
  await failSetupLink(ctx, {
    setupLinkId: args.state.setupLinkId,
    error: args.error,
  })

  return redirectWithGoogleStatus(
    args.state.returnUrl,
    args.integration,
    "error"
  )
}

function redirectWithGoogleStatus(
  returnUrl: string,
  integration: GoogleIntegration,
  status: "connected" | "error"
) {
  return redirectWithStatus(
    returnUrl,
    googleIntegrationConfigs[integration].callbackParam,
    status
  )
}
