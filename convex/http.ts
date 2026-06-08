import { httpRouter } from "convex/server"
import { internal } from "./_generated/api"
import { httpAction } from "./_generated/server"
import {
  slackBotScopes,
  slackOAuthAccessUrl,
  slackOAuthAuthorizeUrl,
  slackOAuthCallbackPath,
  slackUserScopes,
} from "./providers/slack/config"
import {
  getSlackMessage,
  type SlackEventPayload,
} from "./providers/slack/events"
import {
  parseSignedSlackState,
  verifySlackRequest,
} from "./providers/slack/signing"
import { handleMiloMcpRequest } from "./scheduling/mcp"

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
  path: "/milo/mcp",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    return await handleMiloMcpRequest(ctx, request)
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

    const slackUrl = new URL(slackOAuthAuthorizeUrl)
    slackUrl.searchParams.set("client_id", slackClientId)
    slackUrl.searchParams.set("scope", slackBotScopes.join(","))
    slackUrl.searchParams.set("user_scope", slackUserScopes.join(","))
    slackUrl.searchParams.set("state", state)
    slackUrl.searchParams.set(
      "redirect_uri",
      `${requestUrl.origin}${slackOAuthCallbackPath}`
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
      return redirectWithSlackStatus(state.returnUrl, "error")
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
      return Response.json({ challenge: payload.challenge ?? "" })
    }

    if (payload.type !== "event_callback") {
      return Response.json({ ok: true })
    }

    const message = getSlackMessage(payload)

    if (message === null) {
      return Response.json({ ok: true })
    }

    const result = await ctx.runMutation(
      internal.context.messages.recordSlackMessage,
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
      await ctx.scheduler.runAfter(0, internal.runs.runtime.runSlackExecution, {
        executionId: result.executionId,
      })
    }

    return Response.json({ ok: true })
  }),
})

export default http

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

function redirectWithSlackStatus(
  returnUrl: string,
  status: "connected" | "error"
) {
  const url = new URL(returnUrl)
  url.searchParams.set("slack", status)

  return Response.redirect(url.toString(), 302)
}
