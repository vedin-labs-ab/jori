import { defineTable } from "convex/server"
import { v } from "convex/values"
import { actorValidator } from "./actors"

export const skills = defineTable({
  tenantId: v.union(v.string(), v.null()),
  name: v.string(),
  description: v.string(),
  body: v.string(),
  createdBy: v.optional(actorValidator),
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_tenant", ["tenantId"])
  .index("by_tenant_name", ["tenantId", "name"])
