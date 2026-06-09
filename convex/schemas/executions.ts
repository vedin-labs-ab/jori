import { defineTable } from "convex/server"
import { v } from "convex/values"

export const executions = defineTable({
  tenantId: v.string(),
  triggerId: v.id("triggers"),
  promptId: v.id("_storage"),
  sandboxId: v.optional(v.string()),
  hash: v.optional(v.string()),
  status: v.union(
    v.literal("queued"),
    v.literal("running"),
    v.literal("completed"),
    v.literal("failed"),
    v.literal("stopped")
  ),
  error: v.optional(v.string()),
  createdBy: v.optional(v.string()),
  createdAt: v.number(),
  finishedAt: v.optional(v.number()),
})
  .index("by_tenant", ["tenantId"])
  .index("by_trigger", ["triggerId"])
  .index("by_hash", ["hash"])
