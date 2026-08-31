import { type PaginationOptions } from "convex/server"
import { shareExpiresAt } from "../../contracts/shares/expiry"
import { shareFragment } from "../../contracts/shares/fragment"
import { type Id } from "../_generated/dataModel"
import { type MutationCtx } from "../_generated/server"
import { type QueryLikeCtx } from "../shared/context"
import { bytesToHex } from "../shared/encoding"
import { type RuntimeEnvironment, readOrigin } from "../shared/origin"
import { anonymousSight, createSight, type Gate } from "../visibility/sight"

// The one anonymous read mechanism for tables, stores, and files: either a
// secret-bearing share row minted per link, or the material's own public
// visibility. The target is polymorphic, so every domain shares these rows
// and this gate. Both paths are read-only; writes always require a signed-in
// member who passes the visibility resolver.

/** Bounds concurrent live links per target; minting past it retires the
 *  oldest while expired links remain available in the console history. */
export const activeShareLimit = 20

export type ShareTarget = {
  kind: "table" | "store" | "file"
  id: Id<"collections"> | Id<"files">
}

export type MintedShare = { url: string; urlPath: string; expiresAt: number }

/** Create an independent share link; existing links keep their own expiry.
 *  A link is a read capability for this one target regardless of scope. */
export async function mintShare(
  ctx: MutationCtx,
  args: {
    target: ShareTarget
    organizationId: string
    personId: Id<"persons">
    urlPath: string
    expiresInHours?: number
  }
): Promise<MintedShare> {
  const now = Date.now()
  const secret = randomShareSecret()
  const expiresAt = shareExpiresAt(now, args.expiresInHours)
  const activeShares = await ctx.db
    .query("shares")
    .withIndex("by_target_and_expires_at", (index) =>
      index
        .eq("targetKind", args.target.kind)
        .eq("targetId", args.target.id)
        .gt("expiresAt", now)
    )
    .collect()

  for (const stale of sharesToRetire(activeShares, now)) {
    await ctx.db.delete(stale._id)
  }

  await ctx.db.insert("shares", {
    organizationId: args.organizationId,
    createdBy: args.personId,
    secret,
    createdAt: now,
    expiresAt,
    targetKind: args.target.kind,
    targetId: args.target.id,
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
    share.targetKind !== args.target.kind ||
    share.targetId !== args.target.id ||
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
      index.eq("targetKind", target.kind).eq("targetId", target.id)
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
      index.eq("targetKind", target.kind).eq("targetId", target.id)
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

/** How an anonymous read was let in: through a minted link, or through the
 *  material's own public visibility. */
export type MaterialRead =
  | { access: "share"; expiresAt: number }
  | { access: "public" }

/** The one anonymous read gate: a valid share link opens the material, and
 *  a material whose visibility resolves to public (its own setting and its
 *  ancestor folders') opens with no secret at all. Null on any failure so
 *  callers cannot probe what exists. */
export async function openMaterialRead(
  ctx: QueryLikeCtx,
  args: {
    target: ShareTarget
    material: Gate & { archivedAt?: number }
    secret: string | undefined
  }
): Promise<MaterialRead | null> {
  if (args.secret !== undefined && args.secret !== "") {
    const share = await openShare(ctx, args.secret, args)

    if (share !== null) {
      return { access: "share", expiresAt: share.expiresAt }
    }
  }

  const isPublic =
    args.material.archivedAt === undefined &&
    (await anonymousSight(ctx, args.material.organizationId).canSee(
      args.material
    ))

  return isPublic ? { access: "public" } : null
}

/** Resolve a share link to its grant row: secret, expiry, organization,
 *  archive state, and the creator's continued access — the same visibility
 *  question every material answers — all checked on every read. Null on any
 *  failure so callers cannot probe what exists. */
async function openShare(
  ctx: QueryLikeCtx,
  secret: string,
  args: {
    target: ShareTarget
    material: Gate & { archivedAt?: number }
  }
) {
  const share = await ctx.db
    .query("shares")
    .withIndex("by_target_and_secret", (index) =>
      index
        .eq("targetKind", args.target.kind)
        .eq("targetId", args.target.id)
        .eq("secret", secret)
    )
    .unique()

  if (
    share === null ||
    !canOpenShare({
      share,
      material: args.material,
      creatorHasAccess: await createSight(ctx, {
        organizationId: args.material.organizationId,
        personId: share.createdBy,
      }).canSee(args.material),
      secret,
      now: Date.now(),
    })
  ) {
    return null
  }

  return share
}

export function randomShareSecret() {
  return bytesToHex(crypto.getRandomValues(new Uint8Array(32)))
}

/** The one gate every anonymous share read passes through. */
export function canOpenShare(args: {
  share: { secret: string; expiresAt: number; organizationId: string }
  material: { organizationId: string; archivedAt?: number }
  creatorHasAccess: boolean
  secret: string
  now: number
}) {
  return (
    args.share.secret === args.secret &&
    args.share.expiresAt > args.now &&
    args.share.organizationId === args.material.organizationId &&
    args.material.archivedAt === undefined &&
    args.creatorHasAccess
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
