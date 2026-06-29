import { defineTable } from "convex/server"
import { v } from "convex/values"

export const permissions = defineTable({
  tenantId: v.string(),
  tool: v.string(),
  mode: v.union(
    v.literal("allowed"),
    v.literal("prompted"),
    v.literal("blocked")
  ),
  updatedBy: v.id("persons"),
  updatedAt: v.number(),
})
  .index("by_tenant", ["tenantId"])
  .index("by_tenant_and_tool", ["tenantId", "tool"])
