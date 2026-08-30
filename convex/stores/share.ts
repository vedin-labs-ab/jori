import { paginationOptsValidator } from "convex/server"
import { v } from "convex/values"
import { type JsonSchemaObject } from "../../contracts/schema/validate"
import { internal } from "../_generated/api"
import { type Id } from "../_generated/dataModel"
import {
  internalMutation,
  type MutationCtx,
  mutation,
  query,
} from "../_generated/server"
import { findSingletonDocument } from "../collections/documents"
import {
  type MintedShare,
  mintShare,
  openMaterialRead,
  pageShares,
  revokeShare,
  type ShareTarget,
} from "../collections/shares"
import { ensureCurrentPerson, resolveCurrentPerson } from "../persons/account"
import { type QueryLikeCtx } from "../shared/context"
import { createSight } from "../visibility/sight"
import { getAccessibleStore } from "./access"

export const mint = internalMutation({
  args: {
    organizationId: v.string(),
    storeId: v.id("collections"),
    personId: v.id("persons"),
    expiresInHours: v.optional(v.number()),
  },
  handler: async (ctx, args) => await mintStoreShare(ctx, args),
})

export const create = mutation({
  args: {
    organizationId: v.string(),
    storeId: v.id("collections"),
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
    storeId: v.id("collections"),
    shareId: v.id("shares"),
  },
  handler: async (ctx, args): Promise<null> => {
    const personId = await ensureCurrentPerson(ctx, args.organizationId)
    const store = await getAccessibleStore(ctx, { ...args, personId })

    await revokeShare(ctx, {
      target: storeTarget(store._id),
      organizationId: store.organizationId,
      shareId: args.shareId,
    })

    return null
  },
})

export const page = query({
  args: {
    organizationId: v.string(),
    storeId: v.id("collections"),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    const personId = await resolveCurrentPerson(ctx, args.organizationId)
    const store = await getAccessibleStore(ctx, { ...args, personId })

    return await pageShares(ctx, storeTarget(store._id), args.paginationOpts)
  },
})

/** Anonymous read: a share secret or the store's own public visibility is
 *  the whole credential. Returns null on every failure so callers cannot
 *  probe which stores exist. */
export const get = query({
  args: { storeId: v.string(), secret: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const opened = await openStoreShare(ctx, args)

    if (opened === null) {
      return null
    }

    const document = await findSingletonDocument(ctx, opened.store._id)

    return {
      name: opened.store.name,
      description: opened.store.description,
      schema: opened.store.schema as JsonSchemaObject | undefined,
      value: (document?.value ?? null) as unknown,
      version: document?.version ?? 0,
      access: opened.read.access,
      expiresAt:
        opened.read.access === "share" ? opened.read.expiresAt : undefined,
    }
  },
})

export async function mintStoreShare(
  ctx: MutationCtx,
  args: {
    organizationId: string
    storeId: Id<"collections">
    personId: Id<"persons">
    expiresInHours?: number
  }
): Promise<MintedShare> {
  const store = await getAccessibleStore(ctx, args)

  if (store.archivedAt !== undefined) {
    throw new Error("Restore the store before sharing it.")
  }

  return await mintShare(ctx, {
    target: storeTarget(store._id),
    organizationId: store.organizationId,
    personId: args.personId,
    urlPath: `/stores/${store._id}`,
    expiresInHours: args.expiresInHours,
  })
}

/** Resolve an anonymous read to its store: a share link's secret, expiry,
 *  organization, archive state, and the creator's continued access all
 *  checked on every read — or the store's own public visibility. */
export async function openStoreShare(
  ctx: QueryLikeCtx,
  args: { storeId: string; secret?: string }
) {
  const storeId = ctx.db.normalizeId("collections", args.storeId)
  const store = storeId === null ? null : await ctx.db.get(storeId)

  if (store === null || store.kind !== "store") {
    return null
  }

  const read = await openMaterialRead(ctx, {
    target: storeTarget(store._id),
    material: store,
    creatorHasAccess: (createdBy) =>
      createSight(ctx, {
        organizationId: store.organizationId,
        personId: createdBy,
      }).canSee(store),
    secret: args.secret,
  })

  return read === null ? null : { store, read }
}

function storeTarget(storeId: Id<"collections">): ShareTarget {
  return { kind: "store", id: storeId }
}
