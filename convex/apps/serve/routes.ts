import { type HttpRouter } from "convex/server"
import { lazyHttpAction } from "../../shared/lazy"

/** The public app serving surface: the shell, its assets and tool
 *  bridge, and the share-link exchange. Handlers load lazily so the serving
 *  graph stays out of http.ts module evaluation. */
export function registerAppRoutes(http: HttpRouter) {
  http.route({
    pathPrefix: "/assets/",
    method: "GET",
    handler: lazyHttpAction(
      () => import("./http"),
      (module) => (_ctx, request) => module.handleAppStaticAssetRequest(request)
    ),
  })

  http.route({
    pathPrefix: "/apps/render/",
    method: "GET",
    handler: lazyHttpAction(
      () => import("./http"),
      (module) => (_ctx, request) => module.handleAppRenderRequest(request)
    ),
  })

  http.route({
    pathPrefix: "/apps/assets/",
    method: "GET",
    handler: lazyHttpAction(
      () => import("./http"),
      (module) => module.handleAppAssetRequest
    ),
  })

  http.route({
    path: "/apps/tools",
    method: "POST",
    handler: lazyHttpAction(
      () => import("./http"),
      (module) => module.handleAppToolRequest
    ),
  })

  http.route({
    path: "/apps/share",
    method: "POST",
    handler: lazyHttpAction(
      () => import("./share"),
      (module) => module.handleAppShareRequest
    ),
  })

  http.route({
    path: "/apps/share",
    method: "OPTIONS",
    handler: lazyHttpAction(
      () => import("./share"),
      (module) => (_ctx, request) => module.handleAppSharePreflight(request)
    ),
  })
}
