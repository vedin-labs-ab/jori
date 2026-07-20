import { type HttpRouter } from "convex/server"
import { lazyHttpAction } from "../../shared/lazy"

/** The public artifact serving surface: the shell, its assets and tool
 *  bridge, and the share-link exchange. Handlers load lazily so the serving
 *  graph stays out of http.ts module evaluation. */
export function registerArtifactRoutes(http: HttpRouter) {
  http.route({
    pathPrefix: "/assets/",
    method: "GET",
    handler: lazyHttpAction(
      () => import("./http"),
      (module) => (_ctx, request) =>
        module.handleArtifactStaticAssetRequest(request)
    ),
  })

  http.route({
    pathPrefix: "/artifacts/render/",
    method: "GET",
    handler: lazyHttpAction(
      () => import("./http"),
      (module) => (_ctx, request) => module.handleArtifactRenderRequest(request)
    ),
  })

  http.route({
    pathPrefix: "/artifacts/assets/",
    method: "GET",
    handler: lazyHttpAction(
      () => import("./http"),
      (module) => module.handleArtifactAssetRequest
    ),
  })

  http.route({
    path: "/artifacts/tools",
    method: "POST",
    handler: lazyHttpAction(
      () => import("./http"),
      (module) => module.handleArtifactToolRequest
    ),
  })

  http.route({
    path: "/artifacts/share",
    method: "POST",
    handler: lazyHttpAction(
      () => import("./share"),
      (module) => module.handleArtifactShareRequest
    ),
  })

  http.route({
    path: "/artifacts/share",
    method: "OPTIONS",
    handler: lazyHttpAction(
      () => import("./share"),
      (module) => (_ctx, request) =>
        module.handleArtifactSharePreflight(request)
    ),
  })
}
