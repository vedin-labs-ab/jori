import { internal } from "../../_generated/api"
import { type ActionCtx } from "../../_generated/server"
import { readCallbackState, redirectWithStatus } from "../http"
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
    return redirectWithGoogleStatus(state.returnUrl, integration, "error")
  }

  let profile: Awaited<ReturnType<typeof fetchGoogleInstallationProfile>>

  try {
    profile = await fetchGoogleInstallationProfile(tokenResult.access_token)
  } catch {
    return redirectWithGoogleStatus(state.returnUrl, integration, "error")
  }

  try {
    await ctx.runMutation(
      internal.providers.google.install.recordOAuthInstallation,
      {
        integration,
        tenantId: state.tenantId,
        createdBy: state.createdBy,
        accessToken: tokenResult.access_token,
        refreshToken: tokenResult.refresh_token,
        expiresAt: Date.now() + tokenResult.expires_in * 1000,
        scope: tokenResult.scope,
        profile,
      }
    )
  } catch {
    return redirectWithGoogleStatus(state.returnUrl, integration, "error")
  }

  return redirectWithGoogleStatus(state.returnUrl, integration, "connected")
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
