import { internal } from "../../_generated/api"
import { type ActionCtx } from "../../_generated/server"
import {
  handleSlackApprovalDecision,
  handleSlackApprovalInteraction,
} from "../../approvals/slack"
import { newlyRecordedMessageId } from "../../messages/data"
import { createIntegrationActor } from "../../shared/actor"
import {
  readCallbackState,
  redirectWithStatus,
  unauthorizedResponse,
} from "../http"
import {
  slackBotScopes,
  slackInstallUserScopes,
  slackOAuthAuthorizeUrl,
  slackOAuthCallbackPath,
} from "./config"
import { enrichSlackMessageData } from "./directory/channels"
import { getSlackActorProfile } from "./directory/users"
import { getSlackMessage, type SlackEventPayload } from "./events"
import { exchangeSlackAuthorizationCode, requireSlackClientId } from "./oauth"
import { parseSignedSlackState, verifySlackRequest } from "./signing"

export async function handleSlackInstall(request: Request) {
  const requestUrl = new URL(request.url)
  const state = requestUrl.searchParams.get("state")

  if (state === null) {
    return new Response("Missing state", { status: 400 })
  }

  const slackUrl = new URL(slackOAuthAuthorizeUrl)
  slackUrl.searchParams.set("client_id", requireSlackClientId())
  slackUrl.searchParams.set("scope", slackBotScopes.join(","))
  slackUrl.searchParams.set("user_scope", slackInstallUserScopes.join(","))
  slackUrl.searchParams.set("state", state)
  slackUrl.searchParams.set(
    "redirect_uri",
    `${requestUrl.origin}${slackOAuthCallbackPath}`
  )

  return Response.redirect(slackUrl.toString(), 302)
}

export async function handleSlackOAuthCallback(
  ctx: ActionCtx,
  request: Request
) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get("code")
  const stateValue = requestUrl.searchParams.get("state")

  if (code === null || stateValue === null) {
    return new Response("Missing OAuth callback parameters", { status: 400 })
  }

  const parsed = await readCallbackState({
    value: stateValue,
    parse: parseSignedSlackState,
    label: "Slack OAuth",
  })

  if (!parsed.ok) {
    return parsed.response
  }

  const state = parsed.state
  const tokenResult = await exchangeSlackAuthorizationCode({
    code,
    redirectUri: `${requestUrl.origin}${slackOAuthCallbackPath}`,
  })

  const botToken =
    tokenResult.ok === true ? getSlackBotToken(tokenResult) : undefined
  const userToken =
    tokenResult.ok === true ? getSlackUserToken(tokenResult) : undefined

  if (
    tokenResult.ok !== true ||
    botToken === undefined ||
    userToken === undefined
  ) {
    return redirectWithStatus(state.returnUrl, "slack", "error")
  }

  await ctx.runMutation(
    internal.providers.slack.install.recordOAuthInstallation,
    {
      tenantId: state.tenantId,
      createdBy: state.createdBy,
      accountId: tokenResult.team.id,
      botScopes: tokenResult.scope,
      botToken,
      team: tokenResult.team,
      botId: tokenResult.bot_user_id,
      userScopes: tokenResult.authed_user?.scope,
      userToken,
    }
  )

  return redirectWithStatus(state.returnUrl, "slack", "connected")
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

  if (message === null) {
    return Response.json({ ok: true })
  }

  const actorProfile = await getSlackActorProfile(ctx, {
    accountId: message.accountId,
    actorId: message.actorId,
  })

  if (
    await handleSlackApprovalDecision(ctx, {
      accountId: message.accountId,
      actorId: message.actorId,
      actorEmail: actorProfile?.email,
      actorName: actorProfile?.name,
      text: message.text,
      data: message.data,
    })
  ) {
    return Response.json({ ok: true })
  }

  const data = await enrichSlackMessageData(ctx, {
    accountId: message.accountId,
    data: message.data,
  })

  const result = await ctx.runMutation(internal.messages.slack.record, {
    accountId: message.accountId,
    type: message.type,
    externalId: message.externalId,
    actor: createIntegrationActor({
      integration: "slack",
      externalId: message.actorId,
      email: actorProfile?.email,
      name: actorProfile?.name,
    }),
    conversationId: message.conversationId,
    text: message.text,
    observedAt: message.observedAt,
    data,
  })
  const messageId = newlyRecordedMessageId(result)

  if (messageId !== undefined) {
    await ctx.scheduler.runAfter(0, internal.routing.message.route, {
      messageId,
    })
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

  return await handleSlackApprovalInteraction(ctx, parsed)
}

function getSlackBotToken(tokenResult: { access_token?: string }) {
  const token = tokenResult.access_token

  return token === "" ? undefined : token
}

function getSlackUserToken(tokenResult: {
  authed_user?: { access_token?: string }
}) {
  const token = tokenResult.authed_user?.access_token

  return token === "" ? undefined : token
}
