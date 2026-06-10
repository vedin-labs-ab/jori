import { defineTable } from "convex/server"
import { v } from "convex/values"
import { providerValidator } from "../providers/catalog"

const approvalStatus = v.union(
  v.literal("pending"),
  v.literal("approved"),
  v.literal("denied"),
  v.literal("expired"),
  v.literal("consumed")
)

const approvalDelivery = v.object({
  provider: v.string(),
  targetId: v.optional(v.string()),
  messageId: v.optional(v.string()),
  data: v.optional(v.any()),
})

export const approvals = defineTable({
  tenantId: v.string(),
  triggerId: v.id("triggers"),
  executionId: v.id("executions"),
  status: approvalStatus,
  provider: providerValidator,
  tool: v.string(),
  args: v.any(),
  argsHash: v.string(),
  summary: v.string(),
  context: v.optional(v.string()),
  code: v.string(),
  delivery: v.optional(approvalDelivery),
  requestedBy: v.optional(v.string()),
  decidedBy: v.optional(v.string()),
  continuationExecutionId: v.optional(v.id("executions")),
  createdAt: v.number(),
  expiresAt: v.number(),
  decidedAt: v.optional(v.number()),
  consumedAt: v.optional(v.number()),
})
  .index("by_tenant_and_status", ["tenantId", "status"])
  .index("by_tenant_and_code", ["tenantId", "code"])
  .index("by_trigger", ["triggerId"])
  .index("by_execution", ["executionId"])
  .index("by_status_and_expires_at", ["status", "expiresAt"])
