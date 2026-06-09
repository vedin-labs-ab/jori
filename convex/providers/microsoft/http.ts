import { internal } from "../../_generated/api"
import { type ActionCtx } from "../../_generated/server"
import {
  microsoftAdminConsentCallbackPath,
  microsoftAdminConsentUrl,
  microsoftDelegatedScopes,
  microsoftOAuthAuthorizeUrl,
  microsoftOAuthCallbackPath,
} from "./config"
import {
  getMicrosoftNotificationMessage,
  type MicrosoftGraphNotificationPayload,
} from "./events"
import {
  exchangeMicrosoftAuthorizationCode,
  fetchMicrosoftInstallationProfile,
  getMicrosoftTokenScope,
  requireMicrosoftClientId,
} from "./oauth"
import {
  createSignedMicrosoftState,
  parseSignedMicrosoftState,
  verifyMicrosoftClientState,
} from "./signing"

export async function handleMicrosoftInstall(request: Request) {
  const requestUrl = new URL(request.url)
  const state = requestUrl.searchParams.get("state")

  if (state === null) {
    return new Response("Missing state", { status: 400 })
  }

  const microsoftUrl = new URL(microsoftAdminConsentUrl())
  microsoftUrl.searchParams.set("client_id", requireMicrosoftClientId())
  microsoftUrl.searchParams.set(
    "redirect_uri",
    `${requestUrl.origin}${microsoftAdminConsentCallbackPath}`
  )
  microsoftUrl.searchParams.set("state", state)

  return Response.redirect(microsoftUrl.toString(), 302)
}

export async function handleMicrosoftAdminConsentCallback(request: Request) {
  const requestUrl = new URL(request.url)
  const stateValue = requestUrl.searchParams.get("state")
  const microsoftTenantId = requestUrl.searchParams.get("tenant")
  const adminConsent = requestUrl.searchParams.get("admin_consent")

  if (stateValue === null || microsoftTenantId === null) {
    return new Response("Missing Microsoft admin consent parameters", {
      status: 400,
    })
  }

  let state: Awaited<ReturnType<typeof parseSignedMicrosoftState>>

  try {
    state = await parseSignedMicrosoftState(stateValue)
  } catch {
    return new Response("Invalid Microsoft OAuth state", { status: 400 })
  }

  if (Date.now() - state.createdAt > 10 * 60 * 1000) {
    return new Response("Expired Microsoft OAuth state", { status: 400 })
  }

  if (adminConsent !== "True" && adminConsent !== "true") {
    return redirectWithProviderStatus(state.returnUrl, "microsoft", "error")
  }

  const delegatedState = await createSignedMicrosoftState({
    ...state,
    microsoftTenantId,
  })
  const microsoftUrl = new URL(microsoftOAuthAuthorizeUrl(microsoftTenantId))
  microsoftUrl.searchParams.set("client_id", requireMicrosoftClientId())
  microsoftUrl.searchParams.set("response_type", "code")
  microsoftUrl.searchParams.set("scope", microsoftDelegatedScopes.join(" "))
  microsoftUrl.searchParams.set("state", delegatedState)
  microsoftUrl.searchParams.set(
    "redirect_uri",
    `${requestUrl.origin}${microsoftOAuthCallbackPath}`
  )

  return Response.redirect(microsoftUrl.toString(), 302)
}

export async function handleMicrosoftOAuthCallback(
  ctx: ActionCtx,
  request: Request
) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get("code")
  const stateValue = requestUrl.searchParams.get("state")

  if (code === null || stateValue === null) {
    return new Response("Missing OAuth callback parameters", { status: 400 })
  }

  let state: Awaited<ReturnType<typeof parseSignedMicrosoftState>>

  try {
    state = await parseSignedMicrosoftState(stateValue)
  } catch {
    return new Response("Invalid Microsoft OAuth state", { status: 400 })
  }

  if (
    Date.now() - state.createdAt > 10 * 60 * 1000 ||
    state.microsoftTenantId === undefined
  ) {
    return new Response("Expired Microsoft OAuth state", { status: 400 })
  }

  const tokenResult = await exchangeMicrosoftAuthorizationCode({
    code,
    tenantId: state.microsoftTenantId,
    redirectUri: `${requestUrl.origin}${microsoftOAuthCallbackPath}`,
  })

  if ("error" in tokenResult || tokenResult.refresh_token === undefined) {
    return redirectWithProviderStatus(state.returnUrl, "microsoft", "error")
  }

  let profile: Awaited<ReturnType<typeof fetchMicrosoftInstallationProfile>>

  try {
    profile = await fetchMicrosoftInstallationProfile({
      accessToken: tokenResult.access_token,
      tenantId: state.microsoftTenantId,
    })
  } catch {
    return redirectWithProviderStatus(state.returnUrl, "microsoft", "error")
  }

  await ctx.runMutation(
    internal.providers.microsoft.install.recordOAuthInstallation,
    {
      tenantId: state.tenantId,
      createdBy: state.createdBy,
      microsoftTenantId: state.microsoftTenantId,
      accessToken: tokenResult.access_token,
      refreshToken: tokenResult.refresh_token,
      expiresAt: Date.now() + tokenResult.expires_in * 1000,
      scope: getMicrosoftTokenScope(tokenResult.scope),
      profile,
    }
  )

  return redirectWithProviderStatus(state.returnUrl, "microsoft", "connected")
}

export async function handleMicrosoftEvents(ctx: ActionCtx, request: Request) {
  const requestUrl = new URL(request.url)
  const validationToken = requestUrl.searchParams.get("validationToken")

  if (validationToken !== null) {
    return new Response(validationToken, {
      status: 200,
      headers: {
        "content-type": "text/plain; charset=utf-8",
      },
    })
  }

  const payload = (await request.json()) as MicrosoftGraphNotificationPayload

  for (const notification of payload.value ?? []) {
    if (!verifyMicrosoftClientState(notification.clientState)) {
      return unauthorizedResponse()
    }

    const message = await getMicrosoftNotificationMessage(notification)

    if (message === null) {
      continue
    }

    const result = await ctx.runMutation(
      internal.context.messages.recordMicrosoftMessage,
      {
        accountId: message.accountId,
        type: message.type,
        externalId: message.externalId,
        actorId: message.actorId,
        conversationId: message.conversationId,
        text: message.text,
        observedAt: message.observedAt,
        data: message.data,
      }
    )

    if (result.status === "started") {
      await ctx.scheduler.runAfter(
        0,
        internal.runs.runtime.runMessageExecution,
        {
          executionId: result.executionId,
        }
      )
    }
  }

  return Response.json({ ok: true })
}

function unauthorizedResponse() {
  return new Response("Unauthorized", { status: 401 })
}

function redirectWithProviderStatus(
  returnUrl: string,
  provider: "linear" | "microsoft" | "slack",
  status: "connected" | "error"
) {
  const url = new URL(returnUrl)
  url.searchParams.set(provider, status)

  return Response.redirect(url.toString(), 302)
}
