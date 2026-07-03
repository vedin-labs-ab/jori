import { defineTable } from "convex/server"
import { v } from "convex/values"
import { actorValidator } from "../shared/actor"
import { toolSurfaceValidator } from "../shared/integrations"

export const approvalDecision = v.union(
  v.literal("approved"),
  v.literal("denied")
)
const approvalStatus = v.union(
  v.literal("pending"),
  v.literal("approved"),
  v.literal("denied"),
  v.literal("cancelled"),
  v.literal("expired"),
  v.literal("failed")
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
export const approvalDeliveryFailure = v.object({
  failedAt: v.number(),
  message: v.string(),
  operation: v.string(),
  surface: toolSurfaceValidator,
})

export const approvals = defineTable({
  tenantId: v.string(),
  runId: v.id("runs"),
  surface: toolSurfaceValidator,
  tool: v.string(),
  args: v.string(),
  summary: v.string(),
  code: v.string(),
  status: approvalStatus,
  requestedBy: actorValidator,
  decidedBy: v.optional(actorValidator),
  cancelledBy: v.optional(actorValidator),
  cancelReason: v.optional(v.string()),
  createdAt: v.number(),
  expiresAt: v.number(),
  functionId: v.optional(v.id("_scheduled_functions")),
  delivery: v.optional(approvalDelivery),
  deliveryFailure: v.optional(approvalDeliveryFailure),
  cancelledAt: v.optional(v.number()),
  decidedAt: v.optional(v.number()),
  claimedAt: v.optional(v.number()),
  consumedAt: v.optional(v.number()),
  result: v.optional(v.string()),
})
  .index("by_tenant_and_code", ["tenantId", "code"])
  .index("by_run_and_status", ["runId", "status"])
  .index("by_run", ["runId"])
  .index("by_tenant_and_created_at", ["tenantId", "createdAt"])
  .index("by_tenant_and_expires_at", ["tenantId", "expiresAt"])
