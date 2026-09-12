import { type PaginationOptions } from "convex/server"
import { shareExpiresAt } from "../../contracts/shares/expiry"
import { shareFragment } from "../../contracts/shares/fragment"
import { type Id } from "../_generated/dataModel"
import { type MutationCtx } from "../_generated/server"
import {
  assertWorkspaceAvailable,
  isWorkspaceDeleting,
} from "../retention/access"
import { createRunSight } from "../runs/sight"
import { type QueryLikeCtx } from "../shared/context"
import { bytesToHex } from "../shared/encoding"
import { type RuntimeEnvironment, readOrigin } from "../shared/origin"
import { createResourceSight } from "../visibility/resources"
import { createSight, type Gate } from "../visibility/sight"

// The one anonymous read mechanism for tables, stores, and files: a
// secret-bearing share row minted per link. The target is polymorphic, so
// every domain shares these rows and this gate. Reads only; writes always
// require a signed-in member who passes the visibility resolver.

/** Bounds concurrent live links per target; minting past it retires the
 *  oldest while expired links remain available in the console history. */
export const activeShareLimit = 20

export type ShareTarget = {
  kind: "table" | "store" | "file"
  id: Id<"collections"> | Id<"files">
}

export type MintedShare = { url: string; urlPath: string; expiresAt: number }

/** Create an independent share link; existing links keep their own expiry.
 *  A link is a read capability for this one target regardless of scope.
 *  The minting person must be able to hand the material out: their own
 *  access is not enough when a folder restricts what it holds. */
export async function mintShare(
  ctx: MutationCtx,
  args: {
    target: ShareTarget
    material: Gate
    personId?: Id<"persons">
    runId?: Id<"runs">
    urlPath: string
    expiresInHours?: number
  }
): Promise<MintedShare> {
  const organizationId = args.material.organizationId
  await assertWorkspaceAvailable(ctx, organizationId)

  const sight = await createResourceSight(ctx, {
    organizationId,
    personId: args.personId,
    runId: args.runId,
  })
  await requireShareable(sight, args.material, args.target.kind)

  const now = Date.now()
  const secret = randomShareSecret()
  const expiresAt = shareExpiresAt(now, args.expiresInHours)
  const activeShares = await ctx.db
    .query("shares")
    .withIndex("by_target_and_expires_at", (index) =>
      index
        .eq("target.kind", args.target.kind)
        .eq("target.id", args.target.id)
        .gt("expiresAt", now)
    )
    .collect()

  for (const stale of sharesToRetire(activeShares, now)) {
    await ctx.db.delete(stale._id)
  }

  await ctx.db.insert("shares", {
    organizationId,
    createdBy: sight.personId,
    runId: args.runId,
    secret,
    createdAt: now,
    expiresAt,
    target: { kind: args.target.kind, id: args.target.id },
  })

  return mintedShareLink(args.urlPath, secret, expiresAt)
}

export async function revokeShare(
  ctx: MutationCtx,
  args: {
    target: ShareTarget
    organizationId: string
    shareId: Id<"shares">
  }
) {
  const share = await ctx.db.get(args.shareId)

  if (
    share === null ||
    share.target.kind !== args.target.kind ||
    share.target.id !== args.target.id ||
    share.organizationId !== args.organizationId
  ) {
    throw new Error("Share link not found.")
  }

  await ctx.db.delete(share._id)
}

/** A link is a capability for one target, so the links die with it. The cap
 *  sits far above activeShareLimit, leaving room for the expired links kept
 *  as history. */
export async function deleteTargetShares(
  ctx: MutationCtx,
  target: ShareTarget
) {
  const shares = await ctx.db
    .query("shares")
    .withIndex("by_target_and_expires_at", (index) =>
      index.eq("target.kind", target.kind).eq("target.id", target.id)
    )
    .take(activeShareLimit * 20)

  for (const share of shares) {
    await ctx.db.delete(share._id)
  }
}

/** Expiration order is also lifecycle order: every future expiry sorts ahead
 *  of every past expiry, so one indexed cursor yields active links first. */
export async function pageShares(
  ctx: QueryLikeCtx,
  target: ShareTarget,
  paginationOpts: PaginationOptions
) {
  const result = await ctx.db
    .query("shares")
    .withIndex("by_target_and_expires_at", (index) =>
      index.eq("target.kind", target.kind).eq("target.id", target.id)
    )
    .order("desc")
    .paginate(paginationOpts)

  return {
    ...result,
    page: result.page.map((share) => ({
      shareId: share._id,
      createdAt: share.createdAt,
      expiresAt: share.expiresAt,
    })),
  }
}

/** The one anonymous read gate. Resolves a secret to its grant row —
 *  expiry, organization, archive state, and the creator's continued right
 *  to hand this material out, all checked on every read, so filing the
 *  material into a restricting folder closes every outstanding link. Null
 *  on any failure so callers cannot probe what exists. */
export async function openShare(
  ctx: QueryLikeCtx,
  args: {
    target: ShareTarget
    material: Gate & { archivedAt?: number }
    secret: string | undefined
  }
): Promise<{ expiresAt: number } | null> {
  const secret = args.secret

  if (
    secret === undefined ||
    secret === "" ||
    (await isWorkspaceDeleting(ctx, args.material.organizationId))
  ) {
    return null
  }

  const share = await ctx.db
    .query("shares")
    .withIndex("by_target_and_secret", (index) =>
      index
        .eq("target.kind", args.target.kind)
        .eq("target.id", args.target.id)
        .eq("secret", secret)
    )
    .unique()

  if (
    share === null ||
    !canOpenShare({
      share,
      material: args.material,
      creatorCanShare: await shareCreatorCanShare(ctx, share, args.material),
      secret,
      now: Date.now(),
    })
  ) {
    return null
  }

  return { expiresAt: share.expiresAt }
}

/** Minting refuses what the person cannot hand out. The chain is the
 *  reason worth naming: it is fixable by moving the material. */
async function requireShareable(
  sight: Awaited<ReturnType<typeof createResourceSight>>,
  material: Gate,
  kind: ShareTarget["kind"]
) {
  const shareable = await sight.canShare(material)

  if (!shareable) {
    throw new Error(
      `This ${kind} is in a folder that restricts it; move it out of the folder to share it externally.`
    )
  }
}

async function shareCreatorCanShare(
  ctx: QueryLikeCtx,
  share: {
    organizationId: string
    createdBy?: Id<"persons">
    runId?: Id<"runs">
  },
  material: Gate
) {
  if (share.runId !== undefined) {
    const run = await ctx.db.get(share.runId)
    return (
      run?.organizationId === share.organizationId &&
      (await (await createRunSight(ctx, run)).canShare(material))
    )
  }
  return await createSight(ctx, {
    organizationId: share.organizationId,
    personId: share.createdBy,
  }).canShare(material)
}

export function randomShareSecret() {
  return bytesToHex(crypto.getRandomValues(new Uint8Array(32)))
}

/** The one gate every anonymous share read passes through. */
export function canOpenShare(args: {
  share: { secret: string; expiresAt: number; organizationId: string }
  material: { organizationId: string; archivedAt?: number }
  creatorCanShare: boolean
  secret: string
  now: number
}) {
  return (
    args.share.secret === args.secret &&
    args.share.expiresAt > args.now &&
    args.share.organizationId === args.material.organizationId &&
    args.material.archivedAt === undefined &&
    args.creatorCanShare
  )
}

/** When the active set is at capacity, the oldest links make room for the one
 *  about to be minted. Expired links are history and are never retired here. */
export function sharesToRetire<
  Share extends { createdAt: number; expiresAt: number },
>(shares: Share[], now: number) {
  const active = shares
    .filter((share) => share.expiresAt > now)
    .sort((left, right) => left.createdAt - right.createdAt)
  const overflow = Math.max(0, active.length + 1 - activeShareLimit)

  return active.slice(0, overflow)
}

/** What every mint returns: the target's console path with the share secret
 *  in the fragment, plus its expiry. Without a configured origin the path
 *  stands in for the URL. */
export function mintedShareLink(
  urlPath: string,
  secret: string,
  expiresAt: number,
  environment: RuntimeEnvironment = process.env
): MintedShare {
  const fragment = `#${shareFragment(secret)}`
  const path = `${urlPath}${fragment}`
  const origin = readOrigin(environment)

  return {
    url:
      origin === undefined
        ? path
        : `${new URL(urlPath, origin).toString()}${fragment}`,
    urlPath: path,
    expiresAt,
  }
}
