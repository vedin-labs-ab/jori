import { defineTable } from "convex/server"
import { v } from "convex/values"

export const skills = defineTable({
  tenantId: v.union(v.string(), v.null()),
  name: v.string(),
  description: v.string(),
  body: v.string(),
  createdByUserId: v.optional(v.string()),
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_tenant", ["tenantId"])
  .index("by_tenant_name", ["tenantId", "name"])
