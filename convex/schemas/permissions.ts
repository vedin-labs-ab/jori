import { defineTable } from "convex/server"
import { v } from "convex/values"
import { actorValidator } from "./actors"

export const permissions = defineTable({
  tenantId: v.string(),
  tool: v.string(),
  mode: v.union(
    v.literal("allowed"),
    v.literal("prompted"),
    v.literal("blocked")
  ),
  updatedBy: actorValidator,
  updatedAt: v.number(),
})
  .index("by_tenant", ["tenantId"])
  .index("by_tenant_and_tool", ["tenantId", "tool"])
