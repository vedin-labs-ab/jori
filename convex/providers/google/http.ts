import { internal } from "../../_generated/api"
import { type ActionCtx } from "../../_generated/server"
import {
  type GoogleSurfaceProvider,
  googleOAuthAuthorizeUrl,
  googleSurfaceConfigs,
} from "./config"
import {
  exchangeGoogleAuthorizationCode,
  fetchGoogleInstallationProfile,
  getGoogleTokenScope,
  requireGoogleClientId,
} from "./oauth"
import { parseSignedGoogleState } from "./signing"

export async function handleGoogleInstall(
  request: Request,
  provider: GoogleSurfaceProvider
) {
  const surface = googleSurfaceConfigs[provider]
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
  provider: GoogleSurfaceProvider
) {
  const surface = googleSurfaceConfigs[provider]
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get("code")
  const stateValue = requestUrl.searchParams.get("state")

  if (code === null || stateValue === null) {
    return new Response("Missing OAuth callback parameters", { status: 400 })
  }

  let state: Awaited<ReturnType<typeof parseSignedGoogleState>>

  try {
    state = await parseSignedGoogleState(stateValue)
  } catch {
    return new Response("Invalid Google Workspace OAuth state", { status: 400 })
  }

  if (Date.now() - state.createdAt > 10 * 60 * 1000) {
    return new Response("Expired Google Workspace OAuth state", { status: 400 })
  }

  if (state.provider !== provider) {
    return new Response("Mismatched Google Workspace OAuth state", {
      status: 400,
    })
  }

  const tokenResult = await exchangeGoogleAuthorizationCode({
    code,
    redirectUri: `${requestUrl.origin}${surface.callbackPath}`,
  })

  if ("error" in tokenResult) {
    return redirectWithProviderStatus(state.returnUrl, provider, "error")
  }

  let profile: Awaited<ReturnType<typeof fetchGoogleInstallationProfile>>

  try {
    profile = await fetchGoogleInstallationProfile(tokenResult.access_token)
  } catch {
    return redirectWithProviderStatus(state.returnUrl, provider, "error")
  }

  try {
    await ctx.runMutation(
      internal.providers.google.install.recordOAuthInstallation,
      {
        provider,
        tenantId: state.tenantId,
        createdBy: state.createdBy,
        accessToken: tokenResult.access_token,
        refreshToken: tokenResult.refresh_token,
        expiresAt: Date.now() + tokenResult.expires_in * 1000,
        scope: getGoogleTokenScope(tokenResult.scope),
        profile,
      }
    )
  } catch {
    return redirectWithProviderStatus(state.returnUrl, provider, "error")
  }

  return redirectWithProviderStatus(state.returnUrl, provider, "connected")
}

function redirectWithProviderStatus(
  returnUrl: string,
  provider: GoogleSurfaceProvider,
  status: "connected" | "error"
) {
  const url = new URL(returnUrl)
  url.searchParams.set(googleSurfaceConfigs[provider].callbackParam, status)

  return Response.redirect(url.toString(), 302)
}
