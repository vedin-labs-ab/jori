import { internal } from "../../_generated/api"
import { type ActionCtx } from "../../_generated/server"
import { unauthorizedResponse } from "../../shared/http"
import {
  oauthAuthorizeRedirect,
  readOAuthCallback,
  redirectWithStatus,
} from "../connect/http"
import {
  completeIntegrationOffer,
  failOfferAndRedirect,
} from "../connect/install"
import { handleSlackApprovalInteraction } from "./approvals"
import {
  slackBotScopes,
  slackInstallUserScopes,
  slackOAuthAuthorizeUrl,
  slackOAuthCallbackPath,
} from "./config"
import { getSlackMessage, type SlackEventPayload } from "./ingress/events"
import { handleSlackMessageEvent } from "./ingress/messages"
import { exchangeSlackAuthorizationCode, requireSlackClientId } from "./oauth"
import { handleSlackIntegrationOfferInteraction } from "./offers/interaction"
import { parseSignedSlackState, verifySlackRequest } from "./signing"

export async function handleSlackInstall(request: Request) {
  return oauthAuthorizeRedirect(request, {
    authorizeUrl: slackOAuthAuthorizeUrl,
    callbackPath: slackOAuthCallbackPath,
    clientId: requireSlackClientId(),
    params: {
      scope: slackBotScopes.join(","),
      user_scope: slackInstallUserScopes.join(","),
    },
  })
}

export async function handleSlackOAuthCallback(
  ctx: ActionCtx,
  request: Request
) {
  const callback = await readOAuthCallback(ctx, request, {
    parse: parseSignedSlackState,
    label: "Slack OAuth",
  })

  if (!callback.ok) {
    return callback.response
  }

  const { code, requestUrl, state } = callback
  const tokenResult = await exchangeSlackAuthorizationCode({
    code,
    redirectUri: `${requestUrl.origin}${slackOAuthCallbackPath}`,
  })

  // Rotation is a per-app setting, so a missing refresh token means the app
  // is still issuing non-expiring tokens. Refusing the install here beats
  // storing a credential the runtime can never renew.
  const bot =
    tokenResult.ok === true ? readSlackInstallPair(tokenResult) : undefined
  const user =
    tokenResult.ok === true
      ? readSlackInstallPair(tokenResult.authed_user)
      : undefined

  if (tokenResult.ok !== true || bot === undefined || user === undefined) {
    return await failOfferAndRedirect(ctx, {
      callbackParam: "slack",
      error:
        "Slack OAuth did not return rotating bot and user tokens. Check that token rotation is enabled for the app.",
      integrationOfferId: state.integrationOfferId,
      returnUrl: state.returnUrl,
    })
  }

  const integrationId = await ctx.runMutation(
    internal.integrations.slack.install.recordOAuthInstallation,
    {
      organizationId: state.organizationId,
      createdBy: state.createdBy,
      accountId: tokenResult.team.id,
      botScopes: tokenResult.scope,
      bot,
      team: tokenResult.team,
      botUserId: tokenResult.bot_user_id,
      userScopes: tokenResult.authed_user?.scope,
      user,
      setupIdentity: slackSetupIdentity(tokenResult.authed_user?.id),
    }
  )

  await completeIntegrationOffer(ctx, {
    integrationOfferId: state.integrationOfferId,
    integrationId,
  })

  return redirectWithStatus(state.returnUrl, "slack", "connected")
}

function readSlackInstallPair(
  source:
    | { access_token?: string; refresh_token?: string; expires_in?: number }
    | undefined
) {
  if (
    source?.access_token === undefined ||
    source.access_token === "" ||
    source.refresh_token === undefined ||
    source.expires_in === undefined
  ) {
    return undefined
  }

  return {
    access: source.access_token,
    refresh: source.refresh_token,
    expiresAt: Date.now() + source.expires_in * 1000,
  }
}

function slackSetupIdentity(externalId: string | undefined) {
  return externalId === undefined ? undefined : { externalId }
}

export async function handleSlackEvents(ctx: ActionCtx, request: Request) {
  const body = await request.text()
  const verified = await verifySlackRequest(request, body)

  if (!verified) {
    return unauthorizedResponse()
  }

  const payload = JSON.parse(body) as SlackEventPayload

  if (payload.type === "url_verification") {
    return Response.json({ challenge: payload.challenge ?? "" })
  }

  if (payload.type !== "event_callback") {
    return Response.json({ ok: true })
  }

  const message = getSlackMessage(payload)

  if (message !== null) {
    return await handleSlackMessageEvent(ctx, message)
  }

  return Response.json({ ok: true })
}

export async function handleSlackInteractions(
  ctx: ActionCtx,
  request: Request
) {
  const body = await request.text()
  const verified = await verifySlackRequest(request, body)

  if (!verified) {
    return unauthorizedResponse()
  }

  const payload = new URLSearchParams(body).get("payload")

  if (payload === null) {
    return new Response("Missing Slack interaction payload", { status: 400 })
  }

  let parsed: unknown

  try {
    parsed = JSON.parse(payload) as unknown
  } catch {
    return new Response("Invalid Slack interaction payload", { status: 400 })
  }

  if (await handleSlackIntegrationOfferInteraction(ctx, parsed)) {
    return Response.json({ ok: true })
  }

  return await handleSlackApprovalInteraction(ctx, parsed)
}
