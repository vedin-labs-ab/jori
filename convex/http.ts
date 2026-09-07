import { httpRouter } from "convex/server"
import { httpAction } from "./_generated/server"
import { requireEnvironmentVariable } from "./shared/environment"
import { type LazyHandler, lazyHttpAction } from "./shared/lazy"

// Every handler module loads on first request through lazyHttpAction: the
// combined static graph (Better Auth plus every integration) does not fit
// the module evaluation memory ceiling, and each route group only pays for
// itself this way.
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

route(
  "/jori/commands",
  "POST",
  () => import("./runs/execution/waiters/http"),
  (module) => module.handleCommandCallback
)

route(
  "/waitlist",
  "POST",
  () => import("./waitlist/http"),
  (module) => module.handleWaitlistRequest
)

route(
  "/waitlist",
  "OPTIONS",
  () => import("./waitlist/http"),
  (module) => (_ctx, request) => module.handleWaitlistPreflight(request)
)

route(
  "/stripe/events",
  "POST",
  () => import("./billing/stripe/http"),
  (module) => module.handleStripeEvents
)

route(
  "/github/install",
  "GET",
  () => import("./integrations/github/ingress/http"),
  (module) => (_ctx, request) => module.handleGitHubInstall(request)
)

route(
  "/github/install/callback",
  "GET",
  () => import("./integrations/github/ingress/http"),
  (module) => module.handleGitHubInstallCallback
)

route(
  "/github/oauth/callback",
  "GET",
  () => import("./integrations/github/ingress/http"),
  (module) => module.handleGitHubOAuthCallback
)

route(
  "/github/events",
  "POST",
  () => import("./integrations/github/ingress/http"),
  (module) => module.handleGitHubEvents
)

route(
  "/gmail/install",
  "GET",
  () => import("./integrations/google/http"),
  (module) => (_ctx, request) => module.handleGoogleInstall(request, "gmail")
)

route(
  "/google/oauth/callback",
  "GET",
  () => import("./integrations/google/http"),
  (module) => module.handleGoogleOAuthCallback
)

route(
  "/google-calendar/install",
  "GET",
  () => import("./integrations/google/http"),
  (module) => (_ctx, request) =>
    module.handleGoogleInstall(request, "googleCalendar")
)

route(
  "/slack/install",
  "GET",
  () => import("./integrations/slack/http"),
  (module) => (_ctx, request) => module.handleSlackInstall(request)
)

route(
  "/slack/oauth/callback",
  "GET",
  () => import("./integrations/slack/http"),
  (module) => module.handleSlackOAuthCallback
)

route(
  "/slack/events",
  "POST",
  () => import("./integrations/slack/http"),
  (module) => module.handleSlackEvents
)

route(
  "/slack/interactions",
  "POST",
  () => import("./integrations/slack/http"),
  (module) => module.handleSlackInteractions
)

route(
  "/linear/install",
  "GET",
  () => import("./integrations/linear/ingress/http"),
  (module) => (_ctx, request) => module.handleLinearInstall(request)
)

route(
  "/linear/oauth/callback",
  "GET",
  () => import("./integrations/linear/ingress/http"),
  (module) => module.handleLinearOAuthCallback
)

route(
  "/linear/events",
  "POST",
  () => import("./integrations/linear/ingress/http"),
  (module) => module.handleLinearEvents
)

route(
  "/notion/install",
  "GET",
  () => import("./integrations/notion/http"),
  (module) => (_ctx, request) => module.handleNotionInstall(request)
)

route(
  "/notion/oauth/callback",
  "GET",
  () => import("./integrations/notion/http"),
  (module) => module.handleNotionOAuthCallback
)

route(
  "/notion/events",
  "POST",
  () => import("./integrations/notion/http"),
  (module) => module.handleNotionEvents
)

route(
  "/microsoft-email/install",
  "GET",
  () => import("./integrations/microsoft/http"),
  (module) => (_ctx, request) =>
    module.handleMicrosoftInstall(request, "microsoftEmail")
)

route(
  "/microsoft-email/oauth/callback",
  "GET",
  () => import("./integrations/microsoft/http"),
  (module) => (ctx, request) =>
    module.handleMicrosoftOAuthCallback(ctx, request, "microsoftEmail")
)

route(
  "/microsoft-calendar/install",
  "GET",
  () => import("./integrations/microsoft/http"),
  (module) => (_ctx, request) =>
    module.handleMicrosoftInstall(request, "microsoftCalendar")
)

route(
  "/microsoft-calendar/oauth/callback",
  "GET",
  () => import("./integrations/microsoft/http"),
  (module) => (ctx, request) =>
    module.handleMicrosoftOAuthCallback(ctx, request, "microsoftCalendar")
)

function route<Module>(
  path: string,
  method: "GET" | "OPTIONS" | "POST",
  load: () => Promise<Module>,
  pick: (module: Module) => LazyHandler
) {
  http.route({ path, method, handler: lazyHttpAction(load, pick) })
}

export default http
