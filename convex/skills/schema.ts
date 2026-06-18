import { defineTable } from "convex/server"
import { v } from "convex/values"
import { integrationValidator } from "../shared/integrations"

export const skills = defineTable({
  tenantId: v.union(v.string(), v.null()),
  name: v.string(),
  description: v.string(),
  category: v.optional(v.string()),
  associatedIntegrations: v.optional(v.array(integrationValidator)),
  body: v.string(),
  createdBy: v.optional(v.string()),
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_tenant", ["tenantId"])
  .index("by_tenant_name", ["tenantId", "name"])
