import { defineTable } from "convex/server"
import { v } from "convex/values"

export const activations = defineTable({
  tenantId: v.string(),
  triggerId: v.id("triggers"),
  integrationId: v.id("integrations"),
  threadId: v.string(),
  executionId: v.optional(v.id("executions")),
  createdBy: v.optional(v.string()),
  createdAt: v.number(),
})
  .index("by_thread", ["tenantId", "integrationId", "threadId"])
  .index("by_execution", ["executionId"])
