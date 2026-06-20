import { defineTable } from "convex/server"
import { v } from "convex/values"

export const files = defineTable({
  tenantId: v.string(),
  runId: v.id("runs"),
  storageId: v.id("_storage"),
  name: v.string(),
  mimeType: v.string(),
  size: v.number(),
  description: v.optional(v.string()),
  createdAt: v.number(),
})
  .index("by_run", ["runId"])
  .index("by_tenant", ["tenantId"])
  .index("by_tenant_and_created_at", ["tenantId", "createdAt"])
