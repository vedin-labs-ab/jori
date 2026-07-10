import { type HttpRouter } from "convex/server"
import { httpAction } from "../../_generated/server"
import {
  handleArtifactAssetRequest,
  handleArtifactRenderRequest,
  handleArtifactStaticAssetRequest,
  handleArtifactToolRequest,
} from "./http"
import {
  handleArtifactSharePreflight,
  handleArtifactShareRequest,
} from "./share"

/** The public artifact serving surface: the shell, its assets and tool
 *  bridge, and the share-link exchange. */
export function registerArtifactRoutes(http: HttpRouter) {
  http.route({
    pathPrefix: "/assets/",
    method: "GET",
    handler: httpAction((_ctx, request) =>
      handleArtifactStaticAssetRequest(request)
    ),
  })

  http.route({
    pathPrefix: "/artifacts/render/",
    method: "GET",
    handler: httpAction((_ctx, request) =>
      handleArtifactRenderRequest(request)
    ),
  })

  http.route({
    pathPrefix: "/artifacts/assets/",
    method: "GET",
    handler: httpAction((ctx, request) =>
      handleArtifactAssetRequest(ctx, request)
    ),
  })

  http.route({
    path: "/artifacts/tools",
    method: "POST",
    handler: httpAction((ctx, request) =>
      handleArtifactToolRequest(ctx, request)
    ),
  })

  http.route({
    path: "/artifacts/share",
    method: "POST",
    handler: httpAction((ctx, request) =>
      handleArtifactShareRequest(ctx, request)
    ),
  })

  http.route({
    path: "/artifacts/share",
    method: "OPTIONS",
    handler: httpAction(async (_ctx, request) =>
      handleArtifactSharePreflight(request)
    ),
  })
}
