import { defineTable } from "convex/server"
import { v } from "convex/values"

export const artifacts = defineTable({
  tenantId: v.string(),
  executionId: v.id("executions"),
  storageId: v.id("_storage"),
  name: v.string(),
  mimeType: v.string(),
  size: v.number(),
  description: v.optional(v.string()),
  createdAt: v.number(),
})
  .index("by_execution", ["executionId"])
  .index("by_tenant", ["tenantId"])
