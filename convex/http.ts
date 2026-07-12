import { httpRouter } from "convex/server"
import { httpAction } from "./_generated/server"
import { registerArtifactRoutes } from "./artifacts/serve/routes"
import { handleAssetUploadRequest } from "./broker/assets"
import { handleGitHubCloneCredentialsRequest } from "./broker/mcp"
import {
  handleGitHubEvents,
  handleGitHubInstall,
  handleGitHubInstallCallback,
} from "./providers/github/http"
import {
  handleGoogleInstall,
  handleGoogleOAuthCallback,
} from "./providers/google/http"
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
import { unauthorizedResponse } from "./shared/http"

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
  path: "/milo/github/clone-credentials",
  method: "POST",
  handler: httpAction((ctx, request) =>
    handleGitHubCloneCredentialsRequest(ctx, request)
  ),
})

http.route({
  path: "/milo/assets",
  method: "POST",
  handler: httpAction((ctx, request) => handleAssetUploadRequest(ctx, request)),
})

registerArtifactRoutes(http)

http.route({
  path: "/github/install",
  method: "GET",
  handler: httpAction((_ctx, request) => handleGitHubInstall(request)),
})

http.route({
  path: "/github/install/callback",
  method: "GET",
  handler: httpAction((ctx, request) =>
    handleGitHubInstallCallback(ctx, request)
  ),
})

http.route({
  path: "/github/events",
  method: "POST",
  handler: httpAction((ctx, request) => handleGitHubEvents(ctx, request)),
})

http.route({
  path: "/gmail/install",
  method: "GET",
  handler: httpAction((_ctx, request) => handleGoogleInstall(request, "gmail")),
})

http.route({
  path: "/google/oauth/callback",
  method: "GET",
  handler: httpAction((ctx, request) =>
    handleGoogleOAuthCallback(ctx, request)
  ),
})

http.route({
  path: "/google-calendar/install",
  method: "GET",
  handler: httpAction((_ctx, request) =>
    handleGoogleInstall(request, "googleCalendar")
  ),
})

http.route({
  path: "/slack/install",
  method: "GET",
  handler: httpAction((_ctx, request) => handleSlackInstall(request)),
})

http.route({
  path: "/slack/oauth/callback",
  method: "GET",
  handler: httpAction((ctx, request) => handleSlackOAuthCallback(ctx, request)),
})

http.route({
  path: "/slack/events",
  method: "POST",
  handler: httpAction((ctx, request) => handleSlackEvents(ctx, request)),
})

http.route({
  path: "/slack/interactions",
  method: "POST",
  handler: httpAction((ctx, request) => handleSlackInteractions(ctx, request)),
})

http.route({
  path: "/linear/install",
  method: "GET",
  handler: httpAction((_ctx, request) => handleLinearInstall(request)),
})

http.route({
  path: "/linear/oauth/callback",
  method: "GET",
  handler: httpAction((ctx, request) =>
    handleLinearOAuthCallback(ctx, request)
  ),
})

http.route({
  path: "/linear/events",
  method: "POST",
  handler: httpAction((ctx, request) => handleLinearEvents(ctx, request)),
})

http.route({
  path: "/notion/install",
  method: "GET",
  handler: httpAction((_ctx, request) => handleNotionInstall(request)),
})

http.route({
  path: "/notion/oauth/callback",
  method: "GET",
  handler: httpAction((ctx, request) =>
    handleNotionOAuthCallback(ctx, request)
  ),
})

http.route({
  path: "/notion/events",
  method: "POST",
  handler: httpAction((ctx, request) => handleNotionEvents(ctx, request)),
})

http.route({
  path: "/microsoft-email/install",
  method: "GET",
  handler: httpAction((_ctx, request) =>
    handleMicrosoftInstall(request, "microsoftEmail")
  ),
})

http.route({
  path: "/microsoft-email/oauth/callback",
  method: "GET",
  handler: httpAction((ctx, request) =>
    handleMicrosoftOAuthCallback(ctx, request, "microsoftEmail")
  ),
})

http.route({
  path: "/microsoft-calendar/install",
  method: "GET",
  handler: httpAction((_ctx, request) =>
    handleMicrosoftInstall(request, "microsoftCalendar")
  ),
})

http.route({
  path: "/microsoft-calendar/oauth/callback",
  method: "GET",
  handler: httpAction((ctx, request) =>
    handleMicrosoftOAuthCallback(ctx, request, "microsoftCalendar")
  ),
})

export default http
