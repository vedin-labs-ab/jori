import { defineTable } from "convex/server"
import { v } from "convex/values"

export const executions = defineTable({
  tenantId: v.string(),
  sandboxId: v.optional(v.string()),
  status: v.union(
    v.literal("queued"),
    v.literal("running"),
    v.literal("completed"),
    v.literal("failed"),
    v.literal("stopped")
  ),
  createdBy: v.optional(v.string()),
  createdAt: v.number(),
  finishedAt: v.optional(v.number()),
}).index("by_tenant", ["tenantId"])
