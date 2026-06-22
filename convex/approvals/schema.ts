import { defineTable } from "convex/server"
import { v } from "convex/values"
import { actorValidator } from "../shared/actor"
import { toolSurfaceValidator } from "../shared/integrations"

export const approvalDecision = v.union(
  v.literal("approved"),
  v.literal("denied")
)
export const approvalDelivery = v.union(
  v.object({
    integration: v.literal("slack"),
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
  runId: v.id("runs"),
  surface: toolSurfaceValidator,
  tool: v.string(),
  args: v.string(),
  summary: v.string(),
  code: v.string(),
  waitpointId: v.optional(v.string()),
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
  .index("by_waitpoint", ["waitpointId"])
  .index("by_run", ["runId"])
  .index("by_tenant_and_created_at", ["tenantId", "createdAt"])
  .index("by_tenant_and_expires_at", ["tenantId", "expiresAt"])
