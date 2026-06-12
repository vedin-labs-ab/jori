import { httpRouter } from "convex/server"
import { httpAction } from "./_generated/server"
import { handleArtifactUploadRequest } from "./broker/artifacts"
import { handleGitHubTarballRequest, handleMiloMcpRequest } from "./broker/mcp"
import {
  handleGitHubEvents,
  handleGitHubInstall,
  handleGitHubInstallCallback,
} from "./providers/github/http"
import {
  handleGoogleInstall,
  handleGoogleOAuthCallback,
} from "./providers/google/http"
import { unauthorizedResponse } from "./providers/http"
import {
  handleLinearEvents,
  handleLinearInstall,
  handleLinearOAuthCallback,
} from "./providers/linear/http"
import {
  handleMicrosoftInstall,
  handleMicrosoftOAuthCallback,
} from "./providers/microsoft/http"
import {
  handleNotionEvents,
  handleNotionInstall,
  handleNotionOAuthCallback,
} from "./providers/notion/http"
import {
  handleSlackEvents,
  handleSlackInstall,
  handleSlackInteractions,
  handleSlackOAuthCallback,
} from "./providers/slack/http"

const http = httpRouter()

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
  path: "/milo/github/tarball",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    return await handleGitHubTarballRequest(ctx, request)
  }),
})

http.route({
  path: "/milo/artifacts",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    return await handleArtifactUploadRequest(ctx, request)
  }),
})

http.route({
  path: "/github/install",
  method: "GET",
  handler: httpAction(async (_ctx, request) => {
    return await handleGitHubInstall(request)
  }),
})

http.route({
  path: "/github/install/callback",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    return await handleGitHubInstallCallback(ctx, request)
  }),
})

http.route({
  path: "/github/events",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    return await handleGitHubEvents(ctx, request)
  }),
})

http.route({
  path: "/gmail/install",
  method: "GET",
  handler: httpAction(async (_ctx, request) => {
    return await handleGoogleInstall(request, "gmail")
  }),
})

http.route({
  path: "/google/oauth/callback",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    return await handleGoogleOAuthCallback(ctx, request)
  }),
})

http.route({
  path: "/google-calendar/install",
  method: "GET",
  handler: httpAction(async (_ctx, request) => {
    return await handleGoogleInstall(request, "googleCalendar")
  }),
})

http.route({
  path: "/google-drive/install",
  method: "GET",
  handler: httpAction(async (_ctx, request) => {
    return await handleGoogleInstall(request, "googleDrive")
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
  path: "/slack/interactions",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    return await handleSlackInteractions(ctx, request)
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
  path: "/notion/install",
  method: "GET",
  handler: httpAction(async (_ctx, request) => {
    return await handleNotionInstall(request)
  }),
})

http.route({
  path: "/notion/oauth/callback",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    return await handleNotionOAuthCallback(ctx, request)
  }),
})

http.route({
  path: "/notion/events",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    return await handleNotionEvents(ctx, request)
  }),
})

http.route({
  path: "/microsoft-email/install",
  method: "GET",
  handler: httpAction(async (_ctx, request) => {
    return await handleMicrosoftInstall(request, "microsoftEmail")
  }),
})

http.route({
  path: "/microsoft-email/oauth/callback",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    return await handleMicrosoftOAuthCallback(ctx, request, "microsoftEmail")
  }),
})

http.route({
  path: "/microsoft-calendar/install",
  method: "GET",
  handler: httpAction(async (_ctx, request) => {
    return await handleMicrosoftInstall(request, "microsoftCalendar")
  }),
})

http.route({
  path: "/microsoft-calendar/oauth/callback",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    return await handleMicrosoftOAuthCallback(ctx, request, "microsoftCalendar")
  }),
})

export default http
