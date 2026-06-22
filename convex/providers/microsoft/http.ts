import { internal } from "../../_generated/api"
import { type ActionCtx } from "../../_generated/server"
import { readCallbackState, redirectWithStatus } from "../http"
import { completeSetupLink, failSetupLink } from "../install"
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
  const requestUrl = new URL(request.url)
  const state = requestUrl.searchParams.get("state")

  if (state === null) {
    return new Response("Missing state", { status: 400 })
  }

  const microsoftUrl = new URL(microsoftOAuthAuthorizeUrl("organizations"))
  microsoftUrl.searchParams.set("client_id", requireMicrosoftClientId())
  microsoftUrl.searchParams.set("response_type", "code")
  microsoftUrl.searchParams.set("scope", surface.scopes.join(" "))
  microsoftUrl.searchParams.set("state", state)
  microsoftUrl.searchParams.set("prompt", "consent")
  microsoftUrl.searchParams.set(
    "redirect_uri",
    `${requestUrl.origin}${surface.callbackPath}`
  )

  return Response.redirect(microsoftUrl.toString(), 302)
}

export async function handleMicrosoftOAuthCallback(
  ctx: ActionCtx,
  request: Request,
  integration: MicrosoftIntegration
) {
  const surface = microsoftIntegrationConfigs[integration]
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get("code")
  const stateValue = requestUrl.searchParams.get("state")

  if (code === null || stateValue === null) {
    return new Response("Missing OAuth callback parameters", { status: 400 })
  }

  const parsed = await readCallbackState({
    value: stateValue,
    parse: parseSignedMicrosoftState,
    label: "Microsoft OAuth",
  })

  if (!parsed.ok) {
    return parsed.response
  }

  const state = parsed.state

  if (state.integration !== integration) {
    return new Response("Mismatched Microsoft OAuth state", { status: 400 })
  }

  const tokenResult = await exchangeMicrosoftAuthorizationCode({
    code,
    redirectUri: `${requestUrl.origin}${surface.callbackPath}`,
  })

  if ("error" in tokenResult) {
    return await redirectWithMicrosoftSetupError(ctx, {
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
    return await redirectWithMicrosoftSetupError(ctx, {
      state,
      integration,
      error: `${surface.integration} installation profile could not be loaded.`,
    })
  }

  try {
    await recordMicrosoftSetupInstallation(ctx, {
      integration,
      profile,
      state,
      tokenResult,
    })
  } catch {
    return await redirectWithMicrosoftSetupError(ctx, {
      state,
      integration,
      error: `${surface.integration} installation could not be recorded.`,
    })
  }

  return redirectWithMicrosoftStatus(state.returnUrl, integration, "connected")
}

async function recordMicrosoftSetupInstallation(
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
    internal.providers.microsoft.install.recordOAuthInstallation,
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

  await completeSetupLink(ctx, {
    setupLinkId: args.state.setupLinkId,
    integrationId,
  })
}

async function redirectWithMicrosoftSetupError(
  ctx: ActionCtx,
  args: {
    state: MicrosoftInstallState
    integration: MicrosoftIntegration
    error: string
  }
) {
  await failSetupLink(ctx, {
    setupLinkId: args.state.setupLinkId,
    error: args.error,
  })

  return redirectWithMicrosoftStatus(
    args.state.returnUrl,
    args.integration,
    "error"
  )
}

function redirectWithMicrosoftStatus(
  returnUrl: string,
  integration: MicrosoftIntegration,
  status: "connected" | "error"
) {
  return redirectWithStatus(
    returnUrl,
    microsoftIntegrationConfigs[integration].callbackParam,
    status
  )
}
