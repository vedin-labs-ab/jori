import { defineTable } from "convex/server"
import { v } from "convex/values"

export const permissions = defineTable({
  organizationId: v.string(),
  tool: v.string(),
  mode: v.union(
    v.literal("allowed"),
    v.literal("prompted"),
    v.literal("blocked")
  ),
  updatedBy: v.id("persons"),
  updatedAt: v.number(),
})
  .index("by_organization", ["organizationId"])
  .index("by_organization_and_tool", ["organizationId", "tool"])
