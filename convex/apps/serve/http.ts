import { runtimeAssets } from "../../../runtime/apps/_generated/assets"
import { internal } from "../../_generated/api"
import { type Id } from "../../_generated/dataModel"
import { type ActionCtx } from "../../_generated/server"
import { base64DecodeBytes } from "../../shared/encoding"
import { jsonError, unauthorizedResponse } from "../../shared/http"
import { callAppTool } from "../tools/broker"
import { createAppRenderCsp, readAppFramePolicy, renderAppShell } from "./frame"
import {
  createSessionAuthorizationArgs,
  getBearerToken,
  readSessionTokenPayload,
} from "./session"

const renderPrefix = "/apps/render/"
const assetPrefix = "/apps/assets/"
const staticAssetPrefix = "/assets/"

export async function handleAppRenderRequest(request: Request) {
  const appId = parseAppId(request.url)

  if (appId === null) {
    return jsonError("App not found", 404)
  }

  const framePolicy = readAppFramePolicy()

  return new Response(renderAppShell(appId, framePolicy), {
    headers: {
      "content-type": "text/html; charset=utf-8",
      "content-security-policy": createAppRenderCsp(framePolicy),
      "referrer-policy": "no-referrer",
      "x-content-type-options": "nosniff",
    },
  })
}

export async function handleAppToolRequest(ctx: ActionCtx, request: Request) {
  const payload = readSessionTokenPayload(getBearerToken(request) ?? "")

  if (payload === null) {
    return unauthorizedResponse()
  }

  const session = await ctx.runMutation(
    internal.apps.serve.sessions.authorizeSession,
    createSessionAuthorizationArgs(payload, Date.now())
  )

  if (session === null) {
    return unauthorizedResponse()
  }

  const body = await request.json().catch(() => null)

  if (!isToolRequest(body)) {
    return jsonError("Invalid app tool request", 400)
  }

  try {
    return Response.json(
      await callAppTool(
        ctx,
        {
          organizationId: session.organizationId,
          appId: session.appId,
          versionId: session.versionId,
          personId: session.personId,
          grant: session.grant,
        },
        body
      )
    )
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : "App tool request failed",
      400
    )
  }
}

export async function handleAppAssetRequest(ctx: ActionCtx, request: Request) {
  const token = getBearerToken(request)

  if (token === null) {
    return unauthorizedResponse()
  }

  const payload = readSessionTokenPayload(token)
  const requestPath = parseAssetPath(request.url)

  if (payload === null || requestPath === null) {
    return unauthorizedResponse()
  }

  if (requestPath.versionId !== payload.versionId) {
    return unauthorizedResponse()
  }

  const session = await ctx.runMutation(
    internal.apps.serve.sessions.authorizeSession,
    createSessionAuthorizationArgs(payload, Date.now())
  )

  if (session === null) {
    return unauthorizedResponse()
  }

  const asset = await ctx.runQuery(internal.apps.queries.getAsset, requestPath)

  if (asset === null) {
    return jsonError("App asset not found", 404)
  }

  const blob = await ctx.storage.get(asset.storageId)

  if (blob === null) {
    return jsonError("App asset not found", 404)
  }

  return new Response(blob, {
    headers: {
      "content-type": asset.mimeType,
      "cache-control": "private, max-age=60",
      "content-security-policy": "default-src 'none'",
      "x-content-type-options": "nosniff",
    },
  })
}

export async function handleAppStaticAssetRequest(request: Request) {
  const assetPath = parseStaticAssetPath(request.url)

  if (!isGeistFontAsset(assetPath)) {
    return jsonError("Asset not found", 404)
  }

  return new Response(
    base64DecodeBytes(runtimeAssets.app.fonts.geistLatinWoff2),
    {
      headers: {
        "cache-control": "public, max-age=31536000, immutable",
        "content-security-policy": "default-src 'none'",
        "content-type": "font/woff2",
        "x-content-type-options": "nosniff",
      },
    }
  )
}

function parseAppId(url: string) {
  const pathname = new URL(url).pathname

  if (!pathname.startsWith(renderPrefix)) {
    return null
  }

  const appId = pathname.slice(renderPrefix.length).split("/")[0]

  return appId === "" ? null : (appId as Id<"apps">)
}

function parseStaticAssetPath(url: string) {
  const pathname = new URL(url).pathname

  return pathname.startsWith(staticAssetPrefix)
    ? pathname.slice(staticAssetPrefix.length)
    : null
}

function isGeistFontAsset(assetPath: string | null) {
  return (
    assetPath !== null &&
    /^geist-latin-wght-normal(?:-[\w-]+)?\.woff2$/.test(assetPath)
  )
}

function parseAssetPath(url: string) {
  const pathname = new URL(url).pathname

  if (!pathname.startsWith(assetPrefix)) {
    return null
  }

  const [versionId, ...pathSegments] = pathname
    .slice(assetPrefix.length)
    .split("/")

  if (
    versionId === undefined ||
    versionId === "" ||
    pathSegments.length === 0 ||
    pathSegments.some((segment) => segment === "" || segment === "..")
  ) {
    return null
  }

  return {
    versionId: decodeURIComponent(versionId) as Id<"appVersions">,
    path: pathSegments.join("/"),
  }
}

function isToolRequest(value: unknown): value is {
  tool: string
  args?: unknown
  integrationId?: Id<"integrations">
} {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    typeof (value as { tool?: unknown }).tool === "string"
  )
}
