import { defineTable } from "convex/server"
import { v } from "convex/values"
import { scopeValidator } from "../shared/audience"

/** One typed column; mirrors contracts/tables/columns.ts TableColumn. */
export const tableColumn = v.object({
  key: v.string(),
  name: v.string(),
  type: v.union(
    v.literal("boolean"),
    v.literal("integer"),
    v.literal("json"),
    v.literal("number"),
    v.literal("string")
  ),
  required: v.optional(v.boolean()),
  schema: v.optional(v.any()),
})

/** A table: rows typed by a column schema fixed at creation and evolved
 *  only by adding optional columns. */
export const tables = defineTable({
  organizationId: v.string(),
  ownerId: v.id("persons"),
  scope: scopeValidator,
  name: v.string(),
  description: v.optional(v.string()),
  columns: v.array(tableColumn),
  createdAt: v.number(),
  updatedAt: v.number(),
  archivedAt: v.optional(v.number()),
}).index("by_organization_and_updated_at", ["organizationId", "updatedAt"])

/** One row: values keyed by column key, versioned per row. */
export const tableRows = defineTable({
  organizationId: v.string(),
  tableId: v.id("tables"),
  values: v.any(),
  version: v.number(),
  createdAt: v.number(),
  updatedAt: v.number(),
}).index("by_table", ["tableId"])
