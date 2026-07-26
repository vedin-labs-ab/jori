import { httpRouter } from "convex/server"
import { httpAction } from "./_generated/server"
import { registerAppRoutes } from "./apps/serve/routes"
import { requireEnvironmentVariable } from "./shared/environment"
import { lazyHttpAction } from "./shared/lazy"

// Every handler module loads on first request through lazyHttpAction: the
// combined static graph (Better Auth, integrations, app serving) does
// not fit the module evaluation memory ceiling, and each route group only
// pays for itself this way.
const http = httpRouter()

// The route surface mirrors the Better Auth component's registerRoutesLazy.
const handleAuth = lazyHttpAction(
  () => import("./auth"),
  (module) => module.handleAuthRequest
)

http.route({
  path: "/.well-known/openid-configuration",
  method: "GET",
  handler: httpAction(async () => {
    const siteUrl = requireEnvironmentVariable("CONVEX_SITE_URL")

    return await Promise.resolve(
      Response.redirect(
        `${siteUrl}/api/auth/convex/.well-known/openid-configuration`
      )
    )
  }),
})

http.route({ pathPrefix: "/api/auth/", method: "GET", handler: handleAuth })
http.route({ pathPrefix: "/api/auth/", method: "POST", handler: handleAuth })

http.route({
  path: "/jori/github/clone-credentials",
  method: "POST",
  handler: lazyHttpAction(
    () => import("./broker/mcp"),
    (module) => module.handleGitHubCloneCredentialsRequest
  ),
})

http.route({
  path: "/jori/assets",
  method: "POST",
  handler: lazyHttpAction(
    () => import("./broker/assets"),
    (module) => module.handleAssetUploadRequest
  ),
})

registerAppRoutes(http)

http.route({
  path: "/waitlist",
  method: "POST",
  handler: lazyHttpAction(
    () => import("./waitlist/http"),
    (module) => module.handleWaitlistRequest
  ),
})

http.route({
  path: "/waitlist",
  method: "OPTIONS",
  handler: lazyHttpAction(
    () => import("./waitlist/http"),
    (module) => (_ctx, request) => module.handleWaitlistPreflight(request)
  ),
})

http.route({
  path: "/stripe/events",
  method: "POST",
  handler: lazyHttpAction(
    () => import("./billing/stripe/http"),
    (module) => module.handleStripeEvents
  ),
})

http.route({
  path: "/github/install",
  method: "GET",
  handler: lazyHttpAction(
    () => import("./integrations/github/ingress/http"),
    (module) => (_ctx, request) => module.handleGitHubInstall(request)
  ),
})

http.route({
  path: "/github/install/callback",
  method: "GET",
  handler: lazyHttpAction(
    () => import("./integrations/github/ingress/http"),
    (module) => module.handleGitHubInstallCallback
  ),
})

http.route({
  path: "/github/events",
  method: "POST",
  handler: lazyHttpAction(
    () => import("./integrations/github/ingress/http"),
    (module) => module.handleGitHubEvents
  ),
})

http.route({
  path: "/gmail/install",
  method: "GET",
  handler: lazyHttpAction(
    () => import("./integrations/google/http"),
    (module) => (_ctx, request) => module.handleGoogleInstall(request, "gmail")
  ),
})

http.route({
  path: "/google/oauth/callback",
  method: "GET",
  handler: lazyHttpAction(
    () => import("./integrations/google/http"),
    (module) => module.handleGoogleOAuthCallback
  ),
})

http.route({
  path: "/google-calendar/install",
  method: "GET",
  handler: lazyHttpAction(
    () => import("./integrations/google/http"),
    (module) => (_ctx, request) =>
      module.handleGoogleInstall(request, "googleCalendar")
  ),
})

http.route({
  path: "/slack/install",
  method: "GET",
  handler: lazyHttpAction(
    () => import("./integrations/slack/http"),
    (module) => (_ctx, request) => module.handleSlackInstall(request)
  ),
})

http.route({
  path: "/slack/oauth/callback",
  method: "GET",
  handler: lazyHttpAction(
    () => import("./integrations/slack/http"),
    (module) => module.handleSlackOAuthCallback
  ),
})

http.route({
  path: "/slack/events",
  method: "POST",
  handler: lazyHttpAction(
    () => import("./integrations/slack/http"),
    (module) => module.handleSlackEvents
  ),
})

http.route({
  path: "/slack/interactions",
  method: "POST",
  handler: lazyHttpAction(
    () => import("./integrations/slack/http"),
    (module) => module.handleSlackInteractions
  ),
})

http.route({
  path: "/linear/install",
  method: "GET",
  handler: lazyHttpAction(
    () => import("./integrations/linear/ingress/http"),
    (module) => (_ctx, request) => module.handleLinearInstall(request)
  ),
})

http.route({
  path: "/linear/oauth/callback",
  method: "GET",
  handler: lazyHttpAction(
    () => import("./integrations/linear/ingress/http"),
    (module) => module.handleLinearOAuthCallback
  ),
})

http.route({
  path: "/linear/events",
  method: "POST",
  handler: lazyHttpAction(
    () => import("./integrations/linear/ingress/http"),
    (module) => module.handleLinearEvents
  ),
})

http.route({
  path: "/notion/install",
  method: "GET",
  handler: lazyHttpAction(
    () => import("./integrations/notion/http"),
    (module) => (_ctx, request) => module.handleNotionInstall(request)
  ),
})

http.route({
  path: "/notion/oauth/callback",
  method: "GET",
  handler: lazyHttpAction(
    () => import("./integrations/notion/http"),
    (module) => module.handleNotionOAuthCallback
  ),
})

http.route({
  path: "/notion/events",
  method: "POST",
  handler: lazyHttpAction(
    () => import("./integrations/notion/http"),
    (module) => module.handleNotionEvents
  ),
})

http.route({
  path: "/microsoft-email/install",
  method: "GET",
  handler: lazyHttpAction(
    () => import("./integrations/microsoft/http"),
    (module) => (_ctx, request) =>
      module.handleMicrosoftInstall(request, "microsoftEmail")
  ),
})

http.route({
  path: "/microsoft-email/oauth/callback",
  method: "GET",
  handler: lazyHttpAction(
    () => import("./integrations/microsoft/http"),
    (module) => (ctx, request) =>
      module.handleMicrosoftOAuthCallback(ctx, request, "microsoftEmail")
  ),
})

http.route({
  path: "/microsoft-calendar/install",
  method: "GET",
  handler: lazyHttpAction(
    () => import("./integrations/microsoft/http"),
    (module) => (_ctx, request) =>
      module.handleMicrosoftInstall(request, "microsoftCalendar")
  ),
})

http.route({
  path: "/microsoft-calendar/oauth/callback",
  method: "GET",
  handler: lazyHttpAction(
    () => import("./integrations/microsoft/http"),
    (module) => (ctx, request) =>
      module.handleMicrosoftOAuthCallback(ctx, request, "microsoftCalendar")
  ),
})

export default http
