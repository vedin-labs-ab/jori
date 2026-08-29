import { v } from "convex/values"
import { internalMutation } from "../_generated/server"
import {
  createCollection,
  removeCollection,
  restoreCollection,
  updateCollection,
} from "../collections/records"
import { scopeValidator } from "../shared/audience"
import { summarizeStore } from "./access"
import { storeSpec } from "./spec"

export const create = internalMutation({
  args: {
    organizationId: v.string(),
    personId: v.id("persons"),
    name: v.string(),
    description: v.optional(v.string()),
    scope: v.optional(scopeValidator),
    folderId: v.optional(v.id("folders")),
    schema: v.any(),
  },
  handler: async (ctx, args) => {
    const store = await createCollection(ctx, storeSpec, {
      ...args,
      authoring: args.schema,
    })

    return summarizeStore(store)
  },
})

export const update = internalMutation({
  args: {
    organizationId: v.string(),
    storeId: v.id("collections"),
    personId: v.id("persons"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const store = await updateCollection(ctx, storeSpec, {
      organizationId: args.organizationId,
      collectionId: args.storeId,
      personId: args.personId,
      name: args.name,
      description: args.description,
    })

    return store === null ? null : summarizeStore(store)
  },
})

/** Archive an active store; removing an archived one deletes it and its
 *  value permanently. */
export const remove = internalMutation({
  args: {
    organizationId: v.string(),
    storeId: v.id("collections"),
    personId: v.id("persons"),
  },
  handler: async (ctx, args) => {
    const { collectionId, ...outcome } = await removeCollection(
      ctx,
      storeSpec,
      { ...args, collectionId: args.storeId }
    )

    return { storeId: collectionId, ...outcome }
  },
})

export const restore = internalMutation({
  args: {
    organizationId: v.string(),
    storeId: v.id("collections"),
    personId: v.id("persons"),
  },
  handler: async (ctx, args) => {
    const { collectionId, ...outcome } = await restoreCollection(
      ctx,
      storeSpec,
      { ...args, collectionId: args.storeId }
    )

    return { storeId: collectionId, ...outcome }
  },
})
