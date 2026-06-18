import { defineTable } from "convex/server"
import { v } from "convex/values"
import { toolSurfaceValidator } from "../shared/integrations"

export const toolSnapshot = v.object({
  groups: v.array(
    v.object({
      surface: toolSurfaceValidator,
      label: v.string(),
      tools: v.array(
        v.object({
          access: v.union(v.literal("read"), v.literal("write")),
          description: v.string(),
          label: v.string(),
          requiresApproval: v.optional(v.boolean()),
          tool: v.string(),
        })
      ),
    })
  ),
  webSearch: v.boolean(),
})

export const executions = defineTable({
  tenantId: v.string(),
  runId: v.id("runs"),
  approvalId: v.optional(v.id("approvals")),
  promptId: v.optional(v.id("_storage")),
  toolSnapshot: v.optional(toolSnapshot),
  sandboxId: v.optional(v.string()),
  triggerRunId: v.optional(v.string()),
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
  .index("by_trigger_run", ["triggerRunId"])
