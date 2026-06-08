import { httpRouter } from "convex/server"
import { internal } from "./_generated/api"
import { httpAction } from "./_generated/server"
import { parseSignedSlackState, verifySlackRequest } from "./slackShared"

const http = httpRouter()

function unauthorizedResponse() {
  return new Response("Unauthorized", { status: 401 })
}

http.route({
  path: "/ping",
  method: "GET",
  handler: httpAction(async (ctx) => {
    try {
      const identity = await ctx.auth.getUserIdentity()

      if (identity === null) {
        return unauthorizedResponse()
      }
    } catch {
      return unauthorizedResponse()
    }

    return new Response("pong", {
      status: 200,
      headers: {
        "content-type": "text/plain; charset=utf-8",
      },
    })
  }),
})

http.route({
  path: "/slack/install",
  method: "GET",
  handler: httpAction(async (_ctx, request) => {
    const slackClientId = process.env.SLACK_CLIENT_ID

    if (slackClientId === undefined) {
      return new Response("Missing SLACK_CLIENT_ID", { status: 500 })
    }

    const requestUrl = new URL(request.url)
    const state = requestUrl.searchParams.get("state")

    if (state === null) {
      return new Response("Missing state", { status: 400 })
    }

    const slackUrl = new URL("https://slack.com/oauth/v2/authorize")
    slackUrl.searchParams.set("client_id", slackClientId)
    slackUrl.searchParams.set(
      "scope",
      [
        "app_mentions:read",
        "channels:history",
        "groups:history",
        "chat:write",
      ].join(",")
    )
    slackUrl.searchParams.set("state", state)
    slackUrl.searchParams.set(
      "redirect_uri",
      `${requestUrl.origin}/slack/oauth/callback`
    )

    return Response.redirect(slackUrl.toString(), 302)
  }),
})

http.route({
  path: "/slack/oauth/callback",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
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

    const tokenResponse = await fetch("https://slack.com/api/oauth.v2.access", {
      method: "POST",
      headers: {
        "content-type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: slackClientId,
        client_secret: slackClientSecret,
        code,
        redirect_uri: `${requestUrl.origin}/slack/oauth/callback`,
      }),
    })
    const tokenResult = (await tokenResponse.json()) as SlackOAuthResponse

    if (tokenResult.ok !== true) {
      return redirectWithSlackStatus(state.returnUrl, "error")
    }

    await ctx.runMutation(internal.slack.recordOAuthInstallation, {
      tenantId: state.tenantId,
      createdBy: state.createdBy,
      accountId: tokenResult.team.id,
      tokenId: tokenResult.access_token,
      teamName: tokenResult.team.name,
      botUserId: tokenResult.bot_user_id,
    })

    return redirectWithSlackStatus(state.returnUrl, "connected")
  }),
})

http.route({
  path: "/slack/events",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const body = await request.text()
    const verified = await verifySlackRequest(request, body)

    if (!verified) {
      return unauthorizedResponse()
    }

    const payload = JSON.parse(body) as SlackEventPayload

    if (payload.type === "url_verification") {
      return jsonResponse({ challenge: payload.challenge ?? "" })
    }

    if (payload.type !== "event_callback") {
      return jsonResponse({ ok: true })
    }

    const message = getSlackMessage(payload)

    if (message === null) {
      return jsonResponse({ ok: true })
    }

    const result = await ctx.runMutation(internal.slack.recordEventMessage, {
      accountId: message.accountId,
      type: message.type,
      providerId: message.providerId,
      actorId: message.actorId,
      containerId: message.containerId,
      threadId: message.threadId,
      text: message.text,
      occurredAt: message.occurredAt,
      data: message.data,
    })

    if (result.status === "started") {
      await ctx.scheduler.runAfter(0, internal.runtime.runSlackExecution, {
        executionId: result.executionId,
        messageId: result.messageId,
      })
    }

    return jsonResponse({ ok: true })
  }),
})

export default http

type SlackOAuthResponse =
  | {
      ok: true
      access_token: string
      bot_user_id?: string
      team: {
        id: string
        name?: string
      }
    }
  | {
      ok: false
      error?: string
    }

type SlackEventPayload = {
  type: string
  challenge?: string
  team_id?: string
  event_id?: string
  event?: SlackEvent
  authorizations?: Array<{
    team_id?: string
  }>
}

type SlackEvent = {
  type?: string
  subtype?: string
  user?: string
  bot_id?: string
  channel?: string
  text?: string
  ts?: string
  thread_ts?: string
  client_msg_id?: string
}

function getSlackMessage(payload: SlackEventPayload) {
  const event = payload.event

  if (event === undefined) {
    return null
  }

  if (
    event.type !== "app_mention" &&
    !(event.type === "message" && event.subtype === undefined)
  ) {
    return null
  }

  if (event.bot_id !== undefined || event.ts === undefined) {
    return null
  }

  const accountId =
    payload.team_id ??
    payload.authorizations?.find((authorization) => authorization.team_id)
      ?.team_id

  if (accountId === undefined) {
    return null
  }

  const providerId = `slack:${accountId}:${event.client_msg_id ?? event.ts}`

  return {
    accountId,
    type: event.type,
    providerId,
    actorId: event.user,
    containerId: event.channel,
    threadId: event.thread_ts ?? event.ts,
    text: event.text,
    occurredAt: Number.isFinite(Number(event.ts))
      ? Math.round(Number(event.ts) * 1000)
      : undefined,
    data: {
      eventId: payload.event_id,
      ts: event.ts,
      threadTs: event.thread_ts,
    },
  }
}

function jsonResponse(value: unknown) {
  return new Response(JSON.stringify(value), {
    status: 200,
    headers: {
      "content-type": "application/json; charset=utf-8",
    },
  })
}

function redirectWithSlackStatus(
  returnUrl: string,
  status: "connected" | "error"
) {
  const url = new URL(returnUrl)
  url.searchParams.set("slack", status)

  return Response.redirect(url.toString(), 302)
}
