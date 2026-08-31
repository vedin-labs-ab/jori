import { defineTable } from "convex/server"
import { v } from "convex/values"

export const permissionModeValidator = v.union(
  v.literal("allowed"),
  v.literal("prompted"),
  v.literal("blocked")
)

export const permissions = defineTable({
  organizationId: v.string(),
  tool: v.string(),
  mode: permissionModeValidator,
  updatedBy: v.id("persons"),
  updatedAt: v.number(),
})
  .index("by_organization", ["organizationId"])
  .index("by_organization_and_tool", ["organizationId", "tool"])
