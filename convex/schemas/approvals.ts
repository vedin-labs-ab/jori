import { defineTable } from "convex/server"
import { v } from "convex/values"
import { providerValidator } from "../providers/catalog"
import { actorValidator } from "./actors"

const approvalDecision = v.union(v.literal("approved"), v.literal("denied"))

export const approvals = defineTable({
  tenantId: v.string(),
  executionId: v.id("executions"),
  provider: providerValidator,
  tool: v.string(),
  args: v.any(),
  summary: v.string(),
  code: v.string(),
  requestedBy: actorValidator,
  decidedBy: v.optional(actorValidator),
  decision: v.optional(approvalDecision),
  createdAt: v.number(),
  expiresAt: v.number(),
  decidedAt: v.optional(v.number()),
  consumedAt: v.optional(v.number()),
})
  .index("by_tenant_and_code", ["tenantId", "code"])
  .index("by_execution", ["executionId"])
  .index("by_tenant_and_created_at", ["tenantId", "createdAt"])
  .index("by_tenant_and_expires_at", ["tenantId", "expiresAt"])
