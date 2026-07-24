import { v } from "convex/values"
import { shareExpiresAt } from "../../../contracts/apps/share"
import { isRecord } from "../../../contracts/json"
import { internal } from "../../_generated/api"
import { type Doc, type Id } from "../../_generated/dataModel"
import {
  type ActionCtx,
  internalMutation,
  type MutationCtx,
} from "../../_generated/server"
import { bytesToHex } from "../../shared/encoding"
import { unauthorizedResponse } from "../../shared/http"
import { type RuntimeEnvironment } from "../../shared/origin"
import { canAccessApp, getAccessibleApp } from "../access"
import { readAppFramePolicy } from "./frame"
import { appSessionDurationMs, createSessionToken } from "./session"
import { createAppSession } from "./sessions"
import { appShareLink } from "./urls"

/** Bounds concurrent live links per app; minting past it retires the
 *  oldest while expired links remain available in the console history. */
const activeShareLimit = 20

export type AppShareSession = {
  token: string
  appId: Id<"apps">
  versionId: Id<"appVersions">
  expiresAt: number
  title: string
}

/** Create an independent share link; existing links keep their own expiry. */
export const mint = internalMutation({
  args: {
    organizationId: v.string(),
    appId: v.id("apps"),
    personId: v.id("persons"),
    expiresInHours: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<{ url: string; expiresAt: number }> => {
    const app = await requireShareableApp(ctx, args)
    const now = Date.now()
    const secret = randomShareSecret()
    const expiresAt = shareExpiresAt(now, args.expiresInHours)

    const activeShares = await ctx.db
      .query("appShares")
      .withIndex("by_app_and_expires_at", (index) =>
        index.eq("appId", app._id).gt("expiresAt", now)
      )
      .collect()

    for (const stale of sharesToRetire(activeShares, now)) {
      await ctx.db.delete(stale._id)
    }

    await ctx.db.insert("appShares", {
      organizationId: app.organizationId,
      appId: app._id,
      createdBy: args.personId,
      secret,
      createdAt: now,
      expiresAt,
    })

    const link = appShareLink(app._id, secret)

    return { url: link.url ?? link.urlPath, expiresAt }
  },
})

/** Exchange a share secret for a short-lived view-only session. Returns null
 *  on every failure so callers cannot probe which apps exist. */
export const open = internalMutation({
  args: {
    appId: v.string(),
    secret: v.string(),
    now: v.number(),
  },
  handler: async (ctx, args): Promise<AppShareSession | null> => {
    const appId = ctx.db.normalizeId("apps", args.appId)

    if (appId === null) {
      return null
    }

    const app = await ctx.db.get(appId)

    if (app === null) {
      return null
    }

    const share = await ctx.db
      .query("appShares")
      .withIndex("by_app_and_secret", (index) =>
        index.eq("appId", appId).eq("secret", args.secret)
      )
      .unique()

    if (share === null || !canOpenShare(share, app, args)) {
      return null
    }

    const expiresAt = shareSessionExpiresAt(share, args.now)
    const record = await createAppSession(ctx, {
      app,
      personId: share.createdBy,
      grant: "share",
      secret: randomShareSecret(),
      now: args.now,
      expiresAt,
      tokenExpiresAt: expiresAt,
    })

    return {
      token: createSessionToken(record),
      appId: record.appId,
      versionId: record.versionId,
      expiresAt: record.expiresAt,
      title: app.title,
    }
  },
})

export const revoke = internalMutation({
  args: {
    organizationId: v.string(),
    appId: v.id("apps"),
    shareId: v.id("appShares"),
    personId: v.id("persons"),
  },
  handler: async (ctx, args) => {
    const app = await getAccessibleApp(ctx, args)
    const share = await ctx.db.get(args.shareId)

    if (
      share === null ||
      share.appId !== app._id ||
      share.organizationId !== app.organizationId
    ) {
      throw new Error("Share link not found.")
    }

    await ctx.db.delete(share._id)
  },
})

export function canOpenShare(
  share: Doc<"appShares">,
  app: Doc<"apps">,
  args: { secret: string; now: number }
) {
  return (
    share.secret === args.secret &&
    share.expiresAt > args.now &&
    share.organizationId === app.organizationId &&
    app.archivedAt === undefined &&
    app.versionId !== undefined &&
    canAccessApp(app, share.createdBy)
  )
}

/** Sessions never outlive the share grant they were minted from. */
export function shareSessionExpiresAt(
  share: Pick<Doc<"appShares">, "expiresAt">,
  now: number
) {
  return Math.min(now + appSessionDurationMs, share.expiresAt)
}

/** When the active set is at capacity, the oldest links make room for the one
 *  about to be minted. Expired links are history and are never retired here. */
export function sharesToRetire(shares: Doc<"appShares">[], now: number) {
  const active = shares
    .filter((share) => share.expiresAt > now)
    .sort((left, right) => left.createdAt - right.createdAt)
  const overflow = Math.max(0, active.length + 1 - activeShareLimit)

  return active.slice(0, overflow)
}

export async function handleAppShareRequest(
  ctx: ActionCtx,
  request: Request,
  environment: RuntimeEnvironment = process.env
) {
  const cors = shareCorsHeaders(request, environment)
  const body = await request.json().catch(() => null)

  if (!isShareRequest(body)) {
    return unauthorizedResponse(cors)
  }

  const session: AppShareSession | null = await ctx.runMutation(
    internal.apps.serve.share.open,
    { appId: body.appId, secret: body.secret, now: Date.now() }
  )

  return session === null
    ? unauthorizedResponse(cors)
    : Response.json(session, { headers: cors })
}

export function handleAppSharePreflight(
  request: Request,
  environment: RuntimeEnvironment = process.env
) {
  return new Response(null, {
    status: 204,
    headers: {
      ...shareCorsHeaders(request, environment),
      "access-control-allow-headers": "content-type",
      "access-control-allow-methods": "POST",
      "access-control-max-age": "86400",
    },
  })
}

/** The exchange is called from the Milo app origin, unlike the same-origin
 *  loader fetches, so it is the one app endpoint that needs CORS. */
function shareCorsHeaders(
  request: Request,
  environment: RuntimeEnvironment
): Record<string, string> {
  const origin = request.headers.get("origin")
  const allowed =
    origin !== null &&
    readAppFramePolicy(environment).parentOrigins.includes(origin)

  return allowed
    ? { "access-control-allow-origin": origin, vary: "origin" }
    : {}
}

function isShareRequest(
  value: unknown
): value is { appId: string; secret: string } {
  return (
    isRecord(value) &&
    typeof value.appId === "string" &&
    typeof value.secret === "string"
  )
}

async function requireShareableApp(
  ctx: MutationCtx,
  args: {
    organizationId: string
    appId: Id<"apps">
    personId: Id<"persons">
  }
) {
  const app = await getAccessibleApp(ctx, args)

  if (app.archivedAt !== undefined) {
    throw new Error("Restore the app before sharing it.")
  }

  if (app.versionId === undefined) {
    throw new Error("App has no published version.")
  }

  return app
}

function randomShareSecret() {
  return bytesToHex(crypto.getRandomValues(new Uint8Array(32)))
}
