import { defineTable } from "convex/server"
import { v } from "convex/values"

export const persons = defineTable({
  tenantId: v.string(),
  supersededBy: v.optional(v.id("persons")),
  createdAt: v.number(),
  updatedAt: v.number(),
}).index("by_tenant", ["tenantId"])
