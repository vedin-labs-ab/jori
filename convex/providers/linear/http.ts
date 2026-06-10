import { internal } from "../../_generated/api"
import { type ActionCtx } from "../../_generated/server"
import { createProviderActor } from "../../schemas/actors"
import { redirectWithStatus, unauthorizedResponse } from "../http"
import {
  linearOAuthAuthorizeUrl,
  linearOAuthCallbackPath,
  linearOAuthScopes,
} from "./config"
import { getLinearMessage, type LinearWebhookPayload } from "./events"
import {
  exchangeLinearAuthorizationCode,
  fetchLinearInstallationProfile,
  getLinearTokenScope,
  requireLinearClientId,
} from "./oauth"
import { parseSignedLinearState, verifyLinearRequest } from "./signing"

export async function handleLinearInstall(request: Request) {
  const requestUrl = new URL(request.url)
  const state = requestUrl.searchParams.get("state")

  if (state === null) {
    return new Response("Missing state", { status: 400 })
  }

  const linearUrl = new URL(linearOAuthAuthorizeUrl)
  linearUrl.searchParams.set("client_id", requireLinearClientId())
  linearUrl.searchParams.set("response_type", "code")
  linearUrl.searchParams.set("scope", linearOAuthScopes.join(","))
  linearUrl.searchParams.set("state", state)
  linearUrl.searchParams.set("actor", "app")
  linearUrl.searchParams.set(
    "redirect_uri",
    `${requestUrl.origin}${linearOAuthCallbackPath}`
  )

  return Response.redirect(linearUrl.toString(), 302)
}

export async function handleLinearOAuthCallback(
  ctx: ActionCtx,
  request: Request
) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get("code")
  const stateValue = requestUrl.searchParams.get("state")

  if (code === null || stateValue === null) {
    return new Response("Missing OAuth callback parameters", { status: 400 })
  }

  let state: Awaited<ReturnType<typeof parseSignedLinearState>>

  try {
    state = await parseSignedLinearState(stateValue)
  } catch {
    return new Response("Invalid Linear OAuth state", { status: 400 })
  }

  if (Date.now() - state.createdAt > 10 * 60 * 1000) {
    return new Response("Expired Linear OAuth state", { status: 400 })
  }

  const tokenResult = await exchangeLinearAuthorizationCode({
    code,
    redirectUri: `${requestUrl.origin}${linearOAuthCallbackPath}`,
  })

  if ("error" in tokenResult) {
    return redirectWithStatus(state.returnUrl, "linear", "error")
  }

  let profile: Awaited<ReturnType<typeof fetchLinearInstallationProfile>>

  try {
    profile = await fetchLinearInstallationProfile(tokenResult.access_token)
  } catch {
    return redirectWithStatus(state.returnUrl, "linear", "error")
  }

  await ctx.runMutation(
    internal.providers.linear.install.recordOAuthInstallation,
    {
      tenantId: state.tenantId,
      createdByUserId: state.createdByUserId,
      accessToken: tokenResult.access_token,
      refreshToken: tokenResult.refresh_token,
      expiresAt: Date.now() + tokenResult.expires_in * 1000,
      scope: getLinearTokenScope(tokenResult.scope),
      profile,
    }
  )

  return redirectWithStatus(state.returnUrl, "linear", "connected")
}

export async function handleLinearEvents(ctx: ActionCtx, request: Request) {
  const body = await request.text()
  const verified = await verifyLinearRequest(request, body)

  if (!verified) {
    return unauthorizedResponse()
  }

  const payload = JSON.parse(body) as LinearWebhookPayload
  const message = getLinearMessage({
    payload,
    deliveryId: request.headers.get("linear-delivery"),
  })

  if (message === null) {
    return Response.json({ ok: true })
  }

  const result = await ctx.runMutation(
    internal.messages.ingest.recordLinearMessage,
    {
      accountId: message.accountId,
      type: message.type,
      externalId: message.externalId,
      actor: createProviderActor({
        provider: "linear",
        externalId: message.actorId,
        email: message.actorEmail,
      }),
      conversationId: message.conversationId,
      text: message.text,
      observedAt: message.observedAt,
      data: message.data,
    }
  )

  if (result.status === "started") {
    await ctx.scheduler.runAfter(0, internal.runs.runtime.runMessageExecution, {
      triggerId: result.triggerId,
    })
  }

  return Response.json({ ok: true })
}
