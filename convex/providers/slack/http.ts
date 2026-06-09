import { internal } from "../../_generated/api"
import { type ActionCtx } from "../../_generated/server"
import { redirectWithStatus, unauthorizedResponse } from "../http"
import {
  slackBotScopes,
  slackInstallUserScopes,
  slackOAuthAccessUrl,
  slackOAuthAuthorizeUrl,
  slackOAuthCallbackPath,
} from "./config"
import { getSlackMessage, type SlackEventPayload } from "./events"
import { parseSignedSlackState, verifySlackRequest } from "./signing"

export async function handleSlackInstall(request: Request) {
  const slackClientId = process.env.SLACK_CLIENT_ID

  if (slackClientId === undefined) {
    return new Response("Missing SLACK_CLIENT_ID", { status: 500 })
  }

  const requestUrl = new URL(request.url)
  const state = requestUrl.searchParams.get("state")

  if (state === null) {
    return new Response("Missing state", { status: 400 })
  }

  const slackUrl = new URL(slackOAuthAuthorizeUrl)
  slackUrl.searchParams.set("client_id", slackClientId)
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

  let state: Awaited<ReturnType<typeof parseSignedSlackState>>

  try {
    state = await parseSignedSlackState(stateValue)
  } catch {
    return new Response("Invalid Slack OAuth state", { status: 400 })
  }

  if (Date.now() - state.createdAt > 10 * 60 * 1000) {
    return new Response("Expired Slack OAuth state", { status: 400 })
  }

  const slackClientId = process.env.SLACK_CLIENT_ID
  const slackClientSecret = process.env.SLACK_CLIENT_SECRET

  if (slackClientId === undefined || slackClientSecret === undefined) {
    return new Response("Missing Slack OAuth configuration", { status: 500 })
  }

  const tokenResponse = await fetch(slackOAuthAccessUrl, {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      client_id: slackClientId,
      client_secret: slackClientSecret,
      code,
      redirect_uri: `${requestUrl.origin}${slackOAuthCallbackPath}`,
    }),
  })
  const tokenResult = (await tokenResponse.json()) as SlackOAuthResponse

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

  const actorEmail = await getSlackActorEmail(ctx, {
    accountId: message.accountId,
    actorId: message.actorId,
  })

  const result = await ctx.runMutation(
    internal.messages.ingest.recordSlackMessage,
    {
      accountId: message.accountId,
      type: message.type,
      externalId: message.externalId,
      actorId: message.actorId,
      actorEmail,
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

async function getSlackActorEmail(
  ctx: ActionCtx,
  args: {
    accountId: string
    actorId: string | undefined
  }
) {
  if (args.actorId === undefined) {
    return undefined
  }

  const userToken = await ctx.runQuery(
    internal.providers.slack.install.getUserToken,
    {
      accountId: args.accountId,
    }
  )

  if (userToken === null) {
    return undefined
  }

  const slackUrl = new URL("https://slack.com/api/users.info")
  slackUrl.searchParams.set("user", args.actorId)

  const response = await fetch(slackUrl, {
    headers: { authorization: `Bearer ${userToken}` },
  })
  const body = (await response.json().catch(() => null)) as SlackUserInfo | null

  if (!response.ok || body?.ok !== true) {
    return undefined
  }

  const email = body.user?.profile?.email?.trim()

  return email === "" ? undefined : email
}

type SlackOAuthResponse =
  | {
      ok: true
      access_token: string
      bot_user_id?: string
      scope?: string
      authed_user?: {
        access_token?: string
        scope?: string
      }
      team: {
        id: string
        name?: string
      }
    }
  | {
      ok: false
      error?: string
    }

type SlackUserInfo =
  | {
      ok: true
      user?: {
        profile?: {
          email?: string
        }
      }
    }
  | {
      ok: false
      error?: string
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
