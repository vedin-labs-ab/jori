import { v } from "convex/values"
import { internal } from "../_generated/api"
import { type Id } from "../_generated/dataModel"
import { mutation, query } from "../_generated/server"
import { checkOrganizationAccess } from "../access"
import { ensureCurrentPerson, resolveCurrentPerson } from "../persons/account"
import { scopeValidator } from "../shared/audience"
import { findAccessibleStore, searchStores, summarizeStore } from "./access"
import { findValueDocument } from "./values"

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
      stores: stores.map((store) => summarizeStore(store)),
    }
  },
})

export const get = query({
  args: {
    organizationId: v.string(),
    storeId: v.id("stores"),
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

    const document = await findValueDocument(ctx, store._id)

    return {
      status: "ready" as const,
      store: {
        ...summarizeStore(store),
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
    scope: v.optional(scopeValidator),
    schema: v.any(),
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
    storeId: v.id("stores"),
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

export const remove = mutation({
  args: {
    organizationId: v.string(),
    storeId: v.id("stores"),
  },
  handler: async (
    ctx,
    args
  ): Promise<{ storeId: Id<"stores">; archived?: true; deleted?: true }> => {
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
    storeId: v.id("stores"),
  },
  handler: async (
    ctx,
    args
  ): Promise<{ storeId: Id<"stores">; restored: true }> => {
    const personId = await ensureCurrentPerson(ctx, args.organizationId)

    return await ctx.runMutation(internal.stores.records.restore, {
      ...args,
      personId,
    })
  },
})
