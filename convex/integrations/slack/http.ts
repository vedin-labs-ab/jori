import { isRecord } from "../../../contracts/json"
import { internal } from "../../_generated/api"
import { type ActionCtx } from "../../_generated/server"
import { sha256Hex } from "../../shared/crypto"
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
import {
  slackBotScopes,
  slackInstallUserScopes,
  slackOAuthAuthorizeUrl,
  slackOAuthCallbackPath,
} from "./config"
import { type SlackEventPayload, slackEventAccountId } from "./ingress/events"
import { exchangeSlackAuthorizationCode, requireSlackClientId } from "./oauth"
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
      appId: tokenResult.app_id,
      authedUserId: tokenResult.authed_user?.id,
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

  let parsed: unknown
  try {
    parsed = JSON.parse(body)
  } catch {
    return new Response("Invalid Slack event payload", { status: 400 })
  }
  if (!isRecord(parsed) || typeof parsed.type !== "string") {
    return new Response("Invalid Slack event payload", { status: 400 })
  }
  const payload = parsed as SlackEventPayload

  if (payload.type === "url_verification") {
    return Response.json({ challenge: payload.challenge ?? "" })
  }

  if (payload.type !== "event_callback") {
    return Response.json({ ok: true })
  }

  const externalId = slackEventAccountId(payload)
  if (
    typeof externalId !== "string" ||
    externalId === "" ||
    typeof payload.event_id !== "string" ||
    payload.event_id === "" ||
    !isRecord(payload.event)
  ) {
    return new Response("Missing Slack event identifiers", { status: 400 })
  }
  // Omit Slack's obsolete verification token and any unknown outer fields.
  await ctx.runMutation(internal.integrations.webhooks.delivery.accept, {
    provider: "slack",
    externalId,
    eventId: payload.event_id,
    payload: {
      kind: "event",
      event: {
        type: payload.type,
        team_id: externalId,
        event_id: payload.event_id,
        ...(payload.event_time === undefined
          ? {}
          : { event_time: payload.event_time }),
        ...(payload.api_app_id === undefined
          ? {}
          : { api_app_id: payload.api_app_id }),
        event: payload.event,
      },
    },
  })

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

  if (!isRecord(parsed) || parsed.type !== "block_actions") {
    return Response.json({ ok: true })
  }
  const team = isRecord(parsed.team) ? parsed.team : {}
  if (typeof team.id !== "string" || team.id === "") {
    return new Response("Missing Slack interaction workspace", { status: 400 })
  }
  // Block actions need an immediate acknowledgement, not a synchronous view
  // response. Keep only fields consumed by the existing action handlers.
  const interaction = {
    type: parsed.type,
    team: parsed.team,
    user: parsed.user,
    channel: parsed.channel,
    message: parsed.message,
    actions: parsed.actions,
  }
  await ctx.runMutation(internal.integrations.webhooks.delivery.accept, {
    provider: "slack",
    externalId: team.id,
    eventId: `interaction:${await sha256Hex(payload)}`,
    payload: {
      kind: "interaction",
      interaction: JSON.parse(JSON.stringify(interaction)),
    },
  })
  return Response.json({ ok: true })
}
