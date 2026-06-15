import { internal } from "../../_generated/api"
import { type ActionCtx } from "../../_generated/server"
import { readCallbackState, redirectWithStatus } from "../http"
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
    return redirectWithMicrosoftStatus(state.returnUrl, integration, "error")
  }

  let profile: Awaited<ReturnType<typeof fetchMicrosoftInstallationProfile>>

  try {
    profile = await fetchMicrosoftInstallationProfile({
      accessToken: tokenResult.access_token,
    })
  } catch {
    return redirectWithMicrosoftStatus(state.returnUrl, integration, "error")
  }

  try {
    await ctx.runMutation(
      internal.providers.microsoft.install.recordOAuthInstallation,
      {
        integration,
        tenantId: state.tenantId,
        createdBy: state.createdBy,
        microsoftTenantId: profile.tenant.id,
        accessToken: tokenResult.access_token,
        refreshToken: tokenResult.refresh_token,
        expiresAt: Date.now() + tokenResult.expires_in * 1000,
        scope: tokenResult.scope,
        profile,
      }
    )
  } catch {
    return redirectWithMicrosoftStatus(state.returnUrl, integration, "error")
  }

  return redirectWithMicrosoftStatus(state.returnUrl, integration, "connected")
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
