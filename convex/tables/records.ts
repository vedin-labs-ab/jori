import { v } from "convex/values"
import { internalMutation } from "../_generated/server"
import {
  createCollection,
  removeCollection,
  restoreCollection,
  updateCollection,
} from "../collections/records"
import { scopeValidator } from "../shared/audience"
import { summarizeTable } from "./access"
import { tableSpec } from "./spec"

export const create = internalMutation({
  args: {
    organizationId: v.string(),
    personId: v.id("persons"),
    name: v.string(),
    description: v.optional(v.string()),
    scope: v.optional(scopeValidator),
    folderId: v.optional(v.id("folders")),
    columns: v.any(),
  },
  handler: async (ctx, args) => {
    const table = await createCollection(ctx, tableSpec, {
      ...args,
      authoring: args.columns,
    })

    return summarizeTable(table)
  },
})

export const update = internalMutation({
  args: {
    organizationId: v.string(),
    tableId: v.id("collections"),
    personId: v.id("persons"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    columns: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const table = await updateCollection(ctx, tableSpec, {
      organizationId: args.organizationId,
      collectionId: args.tableId,
      personId: args.personId,
      name: args.name,
      description: args.description,
      authoring: args.columns,
    })

    return table === null ? null : summarizeTable(table)
  },
})

/** Archive an active table; removing an archived one deletes it and its
 *  rows permanently. */
export const remove = internalMutation({
  args: {
    organizationId: v.string(),
    tableId: v.id("collections"),
    personId: v.id("persons"),
  },
  handler: async (ctx, args) => {
    const { collectionId, ...outcome } = await removeCollection(
      ctx,
      tableSpec,
      { ...args, collectionId: args.tableId }
    )

    return { tableId: collectionId, ...outcome }
  },
})

export const restore = internalMutation({
  args: {
    organizationId: v.string(),
    tableId: v.id("collections"),
    personId: v.id("persons"),
  },
  handler: async (ctx, args) => {
    const { collectionId, ...outcome } = await restoreCollection(
      ctx,
      tableSpec,
      { ...args, collectionId: args.tableId }
    )

    return { tableId: collectionId, ...outcome }
  },
})
