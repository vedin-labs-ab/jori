import { paginationOptsValidator } from "convex/server"
import { v } from "convex/values"
import { type JsonSchemaObject } from "../../contracts/schema/validate"
import { shareExpiresAt } from "../../contracts/shares/expiry"
import { internal } from "../_generated/api"
import { type Id } from "../_generated/dataModel"
import {
  internalMutation,
  type MutationCtx,
  mutation,
  query,
} from "../_generated/server"
import { canAccessMaterial } from "../materials/access"
import {
  canOpenShare,
  type MintedShare,
  mintedShare,
  randomShareSecret,
  shareLink,
  sharesToRetire,
} from "../materials/shares"
import { ensureCurrentPerson, resolveCurrentPerson } from "../persons/account"
import { type QueryLikeCtx } from "../shared/context"
import { getAccessibleStore } from "./access"
import { findValueDocument } from "./values"

/** Create an independent share link; existing links keep their own expiry.
 *  A link is a read capability for this one store regardless of scope. */
export const mint = internalMutation({
  args: {
    organizationId: v.string(),
    storeId: v.id("stores"),
    personId: v.id("persons"),
    expiresInHours: v.optional(v.number()),
  },
  handler: async (ctx, args) => await mintStoreShare(ctx, args),
})

export const create = mutation({
  args: {
    organizationId: v.string(),
    storeId: v.id("stores"),
    expiresInHours: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<MintedShare> => {
    const personId = await ensureCurrentPerson(ctx, args.organizationId)

    return await ctx.runMutation(internal.stores.share.mint, {
      ...args,
      personId,
    })
  },
})

export const revoke = mutation({
  args: {
    organizationId: v.string(),
    storeId: v.id("stores"),
    shareId: v.id("storeShares"),
  },
  handler: async (ctx, args): Promise<null> => {
    const personId = await ensureCurrentPerson(ctx, args.organizationId)
    const store = await getAccessibleStore(ctx, { ...args, personId })
    const share = await ctx.db.get(args.shareId)

    if (
      share === null ||
      share.storeId !== store._id ||
      share.organizationId !== store.organizationId
    ) {
      throw new Error("Share link not found.")
    }

    await ctx.db.delete(share._id)

    return null
  },
})

/** Expiration order is also lifecycle order: every future expiry sorts ahead
 *  of every past expiry, so one indexed cursor yields active links first. */
export const page = query({
  args: {
    organizationId: v.string(),
    storeId: v.id("stores"),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    const personId = await resolveCurrentPerson(ctx, args.organizationId)

    await getAccessibleStore(ctx, { ...args, personId })

    const result = await ctx.db
      .query("storeShares")
      .withIndex("by_store_and_expires_at", (index) =>
        index.eq("storeId", args.storeId)
      )
      .order("desc")
      .paginate(args.paginationOpts)

    return {
      ...result,
      page: result.page.map((share) => ({
        shareId: share._id,
        createdAt: share.createdAt,
        expiresAt: share.expiresAt,
      })),
    }
  },
})

/** Anonymous share read: the secret is the whole credential. Returns null on
 *  every failure so callers cannot probe which stores exist. */
export const get = query({
  args: { storeId: v.string(), secret: v.string() },
  handler: async (ctx, args) => {
    const opened = await openStoreShare(ctx, args)

    if (opened === null) {
      return null
    }

    const document = await findValueDocument(ctx, opened.store._id)

    return {
      name: opened.store.name,
      description: opened.store.description,
      schema: opened.store.schema as JsonSchemaObject,
      value: (document?.value ?? null) as unknown,
      version: document?.version ?? 0,
      expiresAt: opened.share.expiresAt,
    }
  },
})

export async function mintStoreShare(
  ctx: MutationCtx,
  args: {
    organizationId: string
    storeId: Id<"stores">
    personId: Id<"persons">
    expiresInHours?: number
  }
): Promise<MintedShare> {
  const store = await getAccessibleStore(ctx, args)

  if (store.archivedAt !== undefined) {
    throw new Error("Restore the store before sharing it.")
  }

  const now = Date.now()
  const secret = randomShareSecret()
  const expiresAt = shareExpiresAt(now, args.expiresInHours)
  const activeShares = await ctx.db
    .query("storeShares")
    .withIndex("by_store_and_expires_at", (index) =>
      index.eq("storeId", store._id).gt("expiresAt", now)
    )
    .collect()

  for (const stale of sharesToRetire(activeShares, now)) {
    await ctx.db.delete(stale._id)
  }

  await ctx.db.insert("storeShares", {
    organizationId: store.organizationId,
    storeId: store._id,
    createdBy: args.personId,
    secret,
    createdAt: now,
    expiresAt,
  })

  return mintedShare(shareLink(`/stores/${store._id}`, secret), expiresAt)
}

/** Resolve a share link to its store: secret, expiry, organization, archive
 *  state, and the creator's continued access all checked on every read. */
export async function openStoreShare(
  ctx: QueryLikeCtx,
  args: { storeId: string; secret: string }
) {
  const storeId = ctx.db.normalizeId("stores", args.storeId)
  const store = storeId === null ? null : await ctx.db.get(storeId)

  if (storeId === null || store === null) {
    return null
  }

  const share = await ctx.db
    .query("storeShares")
    .withIndex("by_store_and_secret", (index) =>
      index.eq("storeId", storeId).eq("secret", args.secret)
    )
    .unique()

  if (
    share === null ||
    !canOpenShare({
      share,
      material: store,
      creatorHasAccess: canAccessMaterial(store, share.createdBy),
      secret: args.secret,
      now: Date.now(),
    })
  ) {
    return null
  }

  return { store, share }
}
