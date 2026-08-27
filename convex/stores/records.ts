import { v } from "convex/values"
import { normalizeStoreSchema } from "../../contracts/stores/contract"
import { internalMutation } from "../_generated/server"
import {
  normalizeMaterialDescription,
  normalizeMaterialName,
} from "../materials/input"
import { scopeValidator } from "../shared/audience"
import { getAccessibleStore, summarizeStore } from "./access"

export const create = internalMutation({
  args: {
    organizationId: v.string(),
    personId: v.id("persons"),
    name: v.string(),
    description: v.optional(v.string()),
    scope: v.optional(scopeValidator),
    schema: v.any(),
  },
  handler: async (ctx, args) => {
    const { schema, schemaHash } = normalizeStoreSchema(args.schema)
    const now = Date.now()
    const storeId = await ctx.db.insert("stores", {
      organizationId: args.organizationId,
      ownerId: args.personId,
      scope: args.scope ?? "organization",
      name: normalizeMaterialName(args.name),
      description: normalizeMaterialDescription(args.description),
      schema,
      schemaHash,
      createdAt: now,
      updatedAt: now,
    })
    const store = await ctx.db.get(storeId)

    if (store === null) {
      throw new Error("Store creation failed.")
    }

    return summarizeStore(store)
  },
})

export const update = internalMutation({
  args: {
    organizationId: v.string(),
    storeId: v.id("stores"),
    personId: v.id("persons"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const store = await getAccessibleStore(ctx, args)

    await ctx.db.patch(store._id, {
      ...(args.name === undefined
        ? {}
        : { name: normalizeMaterialName(args.name) }),
      ...(args.description === undefined
        ? {}
        : { description: normalizeMaterialDescription(args.description) }),
      updatedAt: Date.now(),
    })

    const updated = await ctx.db.get(store._id)

    return updated === null ? null : summarizeStore(updated)
  },
})

/** Archive an active store; removing an archived one deletes it and its
 *  value permanently. */
export const remove = internalMutation({
  args: {
    organizationId: v.string(),
    storeId: v.id("stores"),
    personId: v.id("persons"),
  },
  handler: async (ctx, args) => {
    const store = await getAccessibleStore(ctx, args)

    if (store.archivedAt === undefined) {
      const now = Date.now()

      await ctx.db.patch(store._id, { archivedAt: now, updatedAt: now })

      return { storeId: store._id, archived: true as const }
    }

    const value = await ctx.db
      .query("storeValues")
      .withIndex("by_store", (index) => index.eq("storeId", store._id))
      .first()

    if (value !== null) {
      await ctx.db.delete(value._id)
    }

    await ctx.db.delete(store._id)

    return { storeId: store._id, deleted: true as const }
  },
})

export const restore = internalMutation({
  args: {
    organizationId: v.string(),
    storeId: v.id("stores"),
    personId: v.id("persons"),
  },
  handler: async (ctx, args) => {
    const store = await getAccessibleStore(ctx, args)

    await ctx.db.patch(store._id, {
      archivedAt: undefined,
      updatedAt: Date.now(),
    })

    return { storeId: store._id, restored: true as const }
  },
})
