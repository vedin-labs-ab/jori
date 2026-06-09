import { httpRouter } from "convex/server"
import { httpAction } from "./_generated/server"
import {
  handleLinearEvents,
  handleLinearInstall,
  handleLinearOAuthCallback,
} from "./providers/linear/http"
import {
  handleMicrosoftAdminConsentCallback,
  handleMicrosoftEvents,
  handleMicrosoftInstall,
  handleMicrosoftOAuthCallback,
} from "./providers/microsoft/http"
import {
  handleSlackEvents,
  handleSlackInstall,
  handleSlackOAuthCallback,
} from "./providers/slack/http"
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
    return await handleSlackInstall(request)
  }),
})

http.route({
  path: "/slack/oauth/callback",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    return await handleSlackOAuthCallback(ctx, request)
  }),
})

http.route({
  path: "/slack/events",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    return await handleSlackEvents(ctx, request)
  }),
})

http.route({
  path: "/linear/install",
  method: "GET",
  handler: httpAction(async (_ctx, request) => {
    return await handleLinearInstall(request)
  }),
})

http.route({
  path: "/linear/oauth/callback",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    return await handleLinearOAuthCallback(ctx, request)
  }),
})

http.route({
  path: "/linear/events",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    return await handleLinearEvents(ctx, request)
  }),
})

http.route({
  path: "/microsoft/install",
  method: "GET",
  handler: httpAction(async (_ctx, request) => {
    return await handleMicrosoftInstall(request)
  }),
})

http.route({
  path: "/microsoft/admin/callback",
  method: "GET",
  handler: httpAction(async (_ctx, request) => {
    return await handleMicrosoftAdminConsentCallback(request)
  }),
})

http.route({
  path: "/microsoft/oauth/callback",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    return await handleMicrosoftOAuthCallback(ctx, request)
  }),
})

http.route({
  path: "/microsoft/events",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    return await handleMicrosoftEvents(ctx, request)
  }),
})

export default http
