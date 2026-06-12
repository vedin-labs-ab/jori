import { defineTable } from "convex/server"
import { v } from "convex/values"

export const executions = defineTable({
  tenantId: v.string(),
  runId: v.id("runs"),
  approvalId: v.optional(v.id("approvals")),
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
  trace: v.optional(
    v.union(
      v.object({
        host: v.string(),
        token: v.string(),
      }),
      v.object({
        fileId: v.id("_storage"),
      })
    )
  ),
  createdBy: v.optional(v.string()),
  createdAt: v.number(),
  finishedAt: v.optional(v.number()),
  stoppedBy: v.optional(v.string()),
  stoppedAt: v.optional(v.number()),
})
  .index("by_tenant", ["tenantId"])
  .index("by_run", ["runId"])
  .index("by_approval", ["approvalId"])
  .index("by_hash", ["hash"])
