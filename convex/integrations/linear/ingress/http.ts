import { internal } from "../../../_generated/api"
import { type ActionCtx } from "../../../_generated/server"
import { sha256Hex } from "../../../shared/crypto"
import { unauthorizedResponse } from "../../../shared/http"
import {
  oauthAuthorizeRedirect,
  readOAuthCallback,
  redirectWithStatus,
} from "../../connect/http"
import {
  completeIntegrationOffer,
  failOfferAndRedirect,
} from "../../connect/install"
import {
  linearOAuthAuthorizeUrl,
  linearOAuthCallbackPath,
  linearOAuthScopes,
} from "../config"
import {
  exchangeLinearAuthorizationCode,
  fetchLinearInstallationProfile,
  getLinearTokenScope,
  requireLinearClientId,
} from "../oauth"
import { parseSignedLinearState, verifyLinearRequest } from "../signing"
import { type LinearWebhookPayload } from "./events"

export async function handleLinearInstall(request: Request) {
  return oauthAuthorizeRedirect(request, {
    authorizeUrl: linearOAuthAuthorizeUrl,
    callbackPath: linearOAuthCallbackPath,
    clientId: requireLinearClientId(),
    params: {
      response_type: "code",
      scope: linearOAuthScopes.join(","),
      actor: "app",
    },
  })
}

export async function handleLinearOAuthCallback(
  ctx: ActionCtx,
  request: Request
) {
  const callback = await readOAuthCallback(ctx, request, {
    parse: parseSignedLinearState,
    label: "Linear OAuth",
  })

  if (!callback.ok) {
    return callback.response
  }

  const { code, requestUrl, state } = callback
  const tokenResult = await exchangeLinearAuthorizationCode({
    code,
    redirectUri: `${requestUrl.origin}${linearOAuthCallbackPath}`,
  })

  if ("error" in tokenResult) {
    return await failOfferAndRedirect(ctx, {
      callbackParam: "linear",
      error: "Linear OAuth token exchange failed.",
      integrationOfferId: state.integrationOfferId,
      returnUrl: state.returnUrl,
    })
  }

  let profile: Awaited<ReturnType<typeof fetchLinearInstallationProfile>>

  try {
    profile = await fetchLinearInstallationProfile(tokenResult.access_token)
  } catch {
    return await failOfferAndRedirect(ctx, {
      callbackParam: "linear",
      error: "Linear installation profile could not be loaded.",
      integrationOfferId: state.integrationOfferId,
      returnUrl: state.returnUrl,
    })
  }

  const integrationId = await ctx.runMutation(
    internal.integrations.linear.install.recordOAuthInstallation,
    {
      organizationId: state.organizationId,
      createdBy: state.createdBy,
      accessToken: tokenResult.access_token,
      refreshToken: tokenResult.refresh_token,
      expiresAt: Date.now() + tokenResult.expires_in * 1000,
      scope: getLinearTokenScope(tokenResult.scope),
      profile,
    }
  )

  await completeIntegrationOffer(ctx, {
    integrationOfferId: state.integrationOfferId,
    integrationId,
  })

  return redirectWithStatus(state.returnUrl, "linear", "connected")
}

export async function handleLinearEvents(ctx: ActionCtx, request: Request) {
  const body = await request.text()
  const verified = await verifyLinearRequest(request, body)

  if (!verified) {
    return unauthorizedResponse()
  }

  const payload = JSON.parse(body) as LinearWebhookPayload
  const deliveryId = request.headers.get("linear-delivery")
  if (payload.organizationId === undefined || deliveryId === null) {
    return new Response("Invalid Linear event payload", { status: 400 })
  }
  if (
    payload.oauthClientId !== undefined &&
    payload.oauthClientId !== requireLinearClientId()
  ) {
    return unauthorizedResponse()
  }
  await ctx.runMutation(internal.integrations.webhooks.delivery.accept, {
    provider: "linear",
    externalId: payload.organizationId,
    eventId: await sha256Hex(
      JSON.stringify({ ...payload, webhookTimestamp: undefined })
    ),
    payload: { event: payload, deliveryId },
  })
  return Response.json({ ok: true })
}
