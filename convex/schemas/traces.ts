import { defineTable } from "convex/server"
import { v } from "convex/values"

export const traces = defineTable({
  tenantId: v.string(),
  executionId: v.id("executions"),
  fileId: v.id("_storage"),
  createdAt: v.number(),
}).index("by_execution", ["executionId"])
