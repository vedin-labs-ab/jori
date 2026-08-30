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

    return tables.map((table) => agentTableSummary(table))
  },
})

export const read = internalQuery({
  args: {
    organizationId: v.string(),
    tableId: v.id("collections"),
    personId: v.id("persons"),
  },
  handler: async (ctx, args) => {
    const table = await findAccessibleTable(ctx, args)

    return table === null ? null : agentTableSummary(table)
  },
})

/** Agent-facing table summary: columns carry no internal ids — names are
 *  the only column identity the tool surface exposes, and row tools
 *  address columns by name. */
function agentTableSummary(table: Parameters<typeof summarizeTable>[0]) {
  const summary = summarizeTable(table)

  return {
    ...summary,
    columns: summary.columns.map(({ id: _id, ...column }) => column),
  }
}
