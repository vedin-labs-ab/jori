import { v } from "convex/values"
import { shareExpiresAt } from "../../../contracts/artifacts/share"
import { internal } from "../../_generated/api"
import { type Doc, type Id } from "../../_generated/dataModel"
import {
  type ActionCtx,
  internalMutation,
  type MutationCtx,
} from "../../_generated/server"
import { type RuntimeEnvironment } from "../../shared/app"
import { type QueryLikeCtx } from "../../shared/context"
import { unauthorizedResponse } from "../../shared/http"
import { canAccessArtifact, getAccessibleArtifact } from "../access"
import { readArtifactFramePolicy } from "./frame"
import { artifactSessionDurationMs, createSessionToken } from "./session"
import { createArtifactSession } from "./sessions"
import { artifactShareLink } from "./urls"

/** Bounds concurrent live links per artifact; minting past it retires the
 *  oldest. Query headroom above it covers not-yet-pruned expired rows. */
const activeShareLimit = 20
const shareQueryLimit = 50

export type ArtifactShareSession = {
  token: string
  artifactId: Id<"artifacts">
  versionId: Id<"artifactVersions">
  expiresAt: number
  title: string
}

/** Create an independent share link; existing links keep their own expiry. */
export const mint = internalMutation({
  args: {
    tenantId: v.string(),
    artifactId: v.id("artifacts"),
    personId: v.id("persons"),
    expiresInHours: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<{ url: string; expiresAt: number }> => {
    const artifact = await requireShareableArtifact(ctx, args)
    const now = Date.now()
    const secret = randomShareSecret()
    const expiresAt = shareExpiresAt(now, args.expiresInHours)

    for (const stale of sharesToPrune(
      await listShares(ctx, artifact._id),
      now
    )) {
      await ctx.db.delete(stale._id)
    }

    await ctx.db.insert("artifactShares", {
      tenantId: artifact.tenantId,
      artifactId: artifact._id,
      createdBy: args.personId,
      secret,
      createdAt: now,
      expiresAt,
    })

    const link = artifactShareLink(artifact._id, secret)

    return { url: link.url ?? link.urlPath, expiresAt }
  },
})

/** Exchange a share secret for a short-lived view-only session. Returns null
 *  on every failure so callers cannot probe which artifacts exist. */
export const open = internalMutation({
  args: {
    artifactId: v.string(),
    secret: v.string(),
    now: v.number(),
  },
  handler: async (ctx, args): Promise<ArtifactShareSession | null> => {
    const artifactId = ctx.db.normalizeId("artifacts", args.artifactId)

    if (artifactId === null) {
      return null
    }

    const artifact = await ctx.db.get(artifactId)

    if (artifact === null) {
      return null
    }

    const shares = await listShares(ctx, artifactId)
    const share = shares.find((candidate) =>
      canOpenShare(candidate, artifact, args)
    )

    if (share === undefined) {
      return null
    }

    const expiresAt = shareSessionExpiresAt(share, args.now)
    const record = await createArtifactSession(ctx, {
      artifact,
      personId: share.createdBy,
      grant: "share",
      secret: randomShareSecret(),
      now: args.now,
      expiresAt,
      tokenExpiresAt: expiresAt,
    })

    return {
      token: createSessionToken(record),
      artifactId: record.artifactId,
      versionId: record.versionId,
      expiresAt: record.expiresAt,
      title: artifact.title,
    }
  },
})

export const revoke = internalMutation({
  args: {
    tenantId: v.string(),
    artifactId: v.id("artifacts"),
    personId: v.id("persons"),
  },
  handler: async (ctx, args) => {
    const artifact = await getAccessibleArtifact(ctx, args)

    await removeShares(ctx, artifact._id)
  },
})

export function canOpenShare(
  share: Doc<"artifactShares">,
  artifact: Doc<"artifacts">,
  args: { secret: string; now: number }
) {
  return (
    share.secret === args.secret &&
    share.expiresAt > args.now &&
    share.tenantId === artifact.tenantId &&
    artifact.archivedAt === undefined &&
    artifact.versionId !== undefined &&
    canAccessArtifact(artifact, share.createdBy)
  )
}

/** Sessions never outlive the share grant they were minted from. */
export function shareSessionExpiresAt(
  share: Pick<Doc<"artifactShares">, "expiresAt">,
  now: number
) {
  return Math.min(now + artifactSessionDurationMs, share.expiresAt)
}

export async function readActiveShares(
  ctx: QueryLikeCtx,
  artifactId: Id<"artifacts">
) {
  const shares = await listShares(ctx, artifactId)
  const active = shares.filter((share) => share.expiresAt > Date.now())

  if (active.length === 0) {
    return null
  }

  return {
    count: active.length,
    latestExpiresAt: Math.max(...active.map((share) => share.expiresAt)),
  }
}

/** Expired shares always go; when the active set is at capacity, the oldest
 *  active shares make room for the one about to be minted. */
export function sharesToPrune(shares: Doc<"artifactShares">[], now: number) {
  const expired = shares.filter((share) => share.expiresAt <= now)
  const active = shares
    .filter((share) => share.expiresAt > now)
    .sort((left, right) => left.createdAt - right.createdAt)
  const overflow = Math.max(0, active.length + 1 - activeShareLimit)

  return [...expired, ...active.slice(0, overflow)]
}

export async function handleArtifactShareRequest(
  ctx: ActionCtx,
  request: Request,
  environment: RuntimeEnvironment = process.env
) {
  const cors = shareCorsHeaders(request, environment)
  const body = await request.json().catch(() => null)

  if (!isShareRequest(body)) {
    return unauthorizedResponse(cors)
  }

  const session: ArtifactShareSession | null = await ctx.runMutation(
    internal.artifacts.serve.share.open,
    { artifactId: body.artifactId, secret: body.secret, now: Date.now() }
  )

  return session === null
    ? unauthorizedResponse(cors)
    : Response.json(session, { headers: cors })
}

export function handleArtifactSharePreflight(
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
 *  loader fetches, so it is the one artifact endpoint that needs CORS. */
function shareCorsHeaders(
  request: Request,
  environment: RuntimeEnvironment
): Record<string, string> {
  const origin = request.headers.get("origin")
  const allowed =
    origin !== null &&
    readArtifactFramePolicy(environment).parentOrigins.includes(origin)

  return allowed
    ? { "access-control-allow-origin": origin, vary: "origin" }
    : {}
}

function isShareRequest(
  value: unknown
): value is { artifactId: string; secret: string } {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as { artifactId?: unknown }).artifactId === "string" &&
    typeof (value as { secret?: unknown }).secret === "string"
  )
}

async function requireShareableArtifact(
  ctx: MutationCtx,
  args: {
    tenantId: string
    artifactId: Id<"artifacts">
    personId: Id<"persons">
  }
) {
  const artifact = await getAccessibleArtifact(ctx, args)

  if (artifact.archivedAt !== undefined) {
    throw new Error("Restore the artifact before sharing it.")
  }

  if (artifact.versionId === undefined) {
    throw new Error("Artifact has no published version.")
  }

  return artifact
}

async function listShares(ctx: QueryLikeCtx, artifactId: Id<"artifacts">) {
  return await ctx.db
    .query("artifactShares")
    .withIndex("by_artifact", (index) => index.eq("artifactId", artifactId))
    .take(shareQueryLimit)
}

async function removeShares(ctx: MutationCtx, artifactId: Id<"artifacts">) {
  for (const share of await listShares(ctx, artifactId)) {
    await ctx.db.delete(share._id)
  }
}

function randomShareSecret() {
  const bytes = crypto.getRandomValues(new Uint8Array(32))

  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join(
    ""
  )
}
