import { v } from "convex/values"
import { internalQuery } from "../_generated/server"
import { resourceViewerArgs } from "../visibility/resources"
import {
  agentTableSummary,
  findAccessibleTable,
  searchTables,
  summarizeTable,
} from "./access"

export const search = internalQuery({
  args: {
    ...resourceViewerArgs,
    query: v.optional(v.string()),
    includeArchived: v.optional(v.boolean()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const tables = await searchTables(ctx, args)

    return tables.map((table) => agentTableSummary(summarizeTable(table)))
  },
})

export const read = internalQuery({
  args: {
    ...resourceViewerArgs,
    tableId: v.id("collections"),
  },
  handler: async (ctx, args) => {
    const table = await findAccessibleTable(ctx, args)

    return table === null ? null : agentTableSummary(summarizeTable(table))
  },
})
