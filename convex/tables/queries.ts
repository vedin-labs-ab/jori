import { v } from "convex/values"
import { internalQuery } from "../_generated/server"
import { findAccessibleTable, searchTables, summarizeTable } from "./access"

export const search = internalQuery({
  args: {
    organizationId: v.string(),
    personId: v.id("persons"),
    query: v.optional(v.string()),
    includeArchived: v.optional(v.boolean()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const tables = await searchTables(ctx, args)

    return tables.map((table) => summarizeTable(table))
  },
})

export const read = internalQuery({
  args: {
    organizationId: v.string(),
    tableId: v.id("tables"),
    personId: v.id("persons"),
  },
  handler: async (ctx, args) => {
    const table = await findAccessibleTable(ctx, args)

    return table === null ? null : summarizeTable(table)
  },
})
