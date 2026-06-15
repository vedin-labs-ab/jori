import { defineTable } from "convex/server"
import { v } from "convex/values"
import { toolSurfaceValidator } from "../integrations/catalog"
import { actorValidator } from "../shared/actor"

export const approvalDecision = v.union(
  v.literal("approved"),
  v.literal("denied")
)
export const approvalHandoff = v.object({
  objective: v.string(),
  progress: v.string(),
  next: v.string(),
})
export const approvalDelivery = v.union(
  v.object({
    provider: v.literal("slack"),
    integrationId: v.id("integrations"),
    data: v.object({
      channelId: v.string(),
      messageTs: v.string(),
      threadTs: v.optional(v.string()),
    }),
  })
)

export const approvals = defineTable({
  tenantId: v.string(),
  executionId: v.id("executions"),
  provider: toolSurfaceValidator,
  tool: v.string(),
  args: v.any(),
  summary: v.string(),
  handoff: approvalHandoff,
  code: v.string(),
  requestedBy: actorValidator,
  decidedBy: v.optional(actorValidator),
  decision: v.optional(approvalDecision),
  createdAt: v.number(),
  expiresAt: v.number(),
  functionId: v.optional(v.id("_scheduled_functions")),
  delivery: v.optional(approvalDelivery),
  decidedAt: v.optional(v.number()),
  consumedAt: v.optional(v.number()),
})
  .index("by_tenant_and_code", ["tenantId", "code"])
  .index("by_execution", ["executionId"])
  .index("by_tenant_and_created_at", ["tenantId", "createdAt"])
  .index("by_tenant_and_expires_at", ["tenantId", "expiresAt"])
