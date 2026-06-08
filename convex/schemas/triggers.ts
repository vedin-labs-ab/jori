import { defineTable } from "convex/server"
import { v } from "convex/values"

export const triggers = defineTable({
  tenantId: v.string(),
  sourceItemId: v.optional(v.id("sourceItems")),
  type: v.union(
    v.literal("manual"),
    v.literal("scheduled"),
    v.literal("source_item")
  ),
  data: v.optional(v.any()),
  createdBy: v.optional(v.string()),
  createdAt: v.number(),
}).index("by_source_item", ["sourceItemId"])
