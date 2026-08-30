import { v } from "convex/values"
import { internal } from "../_generated/api"
import { type Id } from "../_generated/dataModel"
import { mutation, query } from "../_generated/server"
import { checkOrganizationAccess } from "../access"
import { findSingletonDocument } from "../collections/documents"
import { ensureCurrentPerson, resolveCurrentPerson } from "../persons/account"
import { visibilityValidator } from "../visibility/schema"
import {
  findAccessibleStore,
  searchStores,
  summarizeStoreWithOwner,
} from "./access"

export const list = query({
  args: {
    organizationId: v.string(),
    query: v.string(),
    includeArchived: v.boolean(),
  },
  handler: async (ctx, args) => {
    const access = await checkOrganizationAccess(ctx, args.organizationId)

    if (!access.ok) {
      return {
        status: "unauthorized" as const,
        message: access.message,
        stores: [],
      }
    }

    const personId = await resolveCurrentPerson(ctx, args.organizationId)
    const stores = await searchStores(ctx, {
      organizationId: args.organizationId,
      personId,
      query: args.query,
      includeArchived: args.includeArchived,
      limit: 100,
    })

    return {
      status: "ready" as const,
      stores: await Promise.all(
        stores.map(async (store) => ({
          ...(await summarizeStoreWithOwner(ctx, store)),
          version: (await findSingletonDocument(ctx, store._id))?.version ?? 0,
        }))
      ),
    }
  },
})

export const get = query({
  args: {
    organizationId: v.string(),
    storeId: v.id("collections"),
  },
  handler: async (ctx, args) => {
    const access = await checkOrganizationAccess(ctx, args.organizationId)

    if (!access.ok) {
      return {
        status: "unauthorized" as const,
        message: access.message,
        store: null,
      }
    }

    const personId = await resolveCurrentPerson(ctx, args.organizationId)
    const store = await findAccessibleStore(ctx, { ...args, personId })

    if (store === null) {
      return { status: "not_found" as const, store: null }
    }

    const document = await findSingletonDocument(ctx, store._id)

    return {
      status: "ready" as const,
      store: {
        ...(await summarizeStoreWithOwner(ctx, store)),
        value: (document?.value ?? null) as unknown,
        version: document?.version ?? 0,
      },
    }
  },
})

export const create = mutation({
  args: {
    organizationId: v.string(),
    name: v.string(),
    description: v.optional(v.string()),
    visibility: v.optional(visibilityValidator),
    folderId: v.optional(v.id("folders")),
    schema: v.optional(v.any()),
  },
  handler: async (ctx, args): Promise<unknown> => {
    const personId = await ensureCurrentPerson(ctx, args.organizationId)

    return await ctx.runMutation(internal.stores.records.create, {
      ...args,
      personId,
    })
  },
})

export const update = mutation({
  args: {
    organizationId: v.string(),
    storeId: v.id("collections"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<unknown> => {
    const personId = await ensureCurrentPerson(ctx, args.organizationId)

    return await ctx.runMutation(internal.stores.records.update, {
      ...args,
      personId,
    })
  },
})

/** Add, replace, or remove the store's schema constraint. A schema the
 *  current value violates is rejected, never saved over it. */
export const writeSchema = mutation({
  args: {
    organizationId: v.string(),
    storeId: v.id("collections"),
    /** The new JSON Schema, or null to remove the constraint. */
    schema: v.any(),
  },
  handler: async (ctx, args): Promise<unknown> => {
    const personId = await ensureCurrentPerson(ctx, args.organizationId)

    return await ctx.runMutation(internal.stores.records.reschema, {
      ...args,
      personId,
    })
  },
})

export const writeValue = mutation({
  args: {
    organizationId: v.string(),
    storeId: v.id("collections"),
    value: v.any(),
    expectedVersion: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<unknown> => {
    const personId = await ensureCurrentPerson(ctx, args.organizationId)

    return await ctx.runMutation(internal.stores.values.write, {
      organizationId: args.organizationId,
      storeId: args.storeId,
      personId,
      expectedVersion: args.expectedVersion,
      write: { type: "replace", value: args.value },
    })
  },
})

export const remove = mutation({
  args: {
    organizationId: v.string(),
    storeId: v.id("collections"),
  },
  handler: async (
    ctx,
    args
  ): Promise<{
    storeId: Id<"collections">
    archived?: true
    deleted?: true
  }> => {
    const personId = await ensureCurrentPerson(ctx, args.organizationId)

    return await ctx.runMutation(internal.stores.records.remove, {
      ...args,
      personId,
    })
  },
})

export const restore = mutation({
  args: {
    organizationId: v.string(),
    storeId: v.id("collections"),
  },
  handler: async (
    ctx,
    args
  ): Promise<{ storeId: Id<"collections">; restored: true }> => {
    const personId = await ensureCurrentPerson(ctx, args.organizationId)

    return await ctx.runMutation(internal.stores.records.restore, {
      ...args,
      personId,
    })
  },
})
