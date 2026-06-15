import { defineTable } from "convex/server"
import { v } from "convex/values"

export const skills = defineTable({
  tenantId: v.union(v.string(), v.null()),
  name: v.string(),
  description: v.string(),
  body: v.string(),
  createdBy: v.optional(v.string()),
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_tenant", ["tenantId"])
  .index("by_tenant_name", ["tenantId", "name"])

export const skillSettings = defineTable({
  tenantId: v.string(),
  skillName: v.string(),
  enabled: v.boolean(),
  updatedBy: v.string(),
  updatedAt: v.number(),
})
  .index("by_tenant", ["tenantId"])
  .index("by_tenant_and_skill", ["tenantId", "skillName"])
