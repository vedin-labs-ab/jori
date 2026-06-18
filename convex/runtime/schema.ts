import { defineTable } from "convex/server"
import { v } from "convex/values"

const runtimeOperation = v.union(
  v.object({
    type: v.literal("enqueueRun"),
    runId: v.id("runs"),
    executionId: v.id("executions"),
    parentRunId: v.optional(v.id("runs")),
    rootRunId: v.optional(v.id("runs")),
  }),
  v.object({
    type: v.literal("resumeApproval"),
    approvalId: v.id("approvals"),
    decision: v.union(v.literal("approved"), v.literal("denied")),
    waitpointTokenId: v.string(),
  }),
  v.object({
    type: v.literal("cancelRun"),
    executionId: v.id("executions"),
    runId: v.id("runs"),
    sandboxId: v.optional(v.string()),
    triggerRunId: v.optional(v.string()),
  })
)

export const runtimeOutbox = defineTable({
  tenantId: v.string(),
  operation: runtimeOperation,
  idempotencyKey: v.string(),
  state: v.union(
    v.literal("pending"),
    v.literal("processing"),
    v.literal("sent"),
    v.literal("failed")
  ),
  attempts: v.number(),
  nextAttemptAt: v.number(),
  lastError: v.optional(v.string()),
  externalId: v.optional(v.string()),
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_state_and_next_attempt", ["state", "nextAttemptAt"])
  .index("by_idempotency", ["idempotencyKey"])
  .index("by_tenant", ["tenantId"])

export const runtimeEvents = defineTable({
  tenantId: v.string(),
  runId: v.id("runs"),
  executionId: v.optional(v.id("executions")),
  eventKey: v.string(),
  source: v.string(),
  type: v.string(),
  sequence: v.optional(v.number()),
  toolCallId: v.optional(v.string()),
  attempt: v.optional(v.number()),
  payload: v.optional(v.any()),
  createdAt: v.number(),
})
  .index("by_run", ["runId", "createdAt"])
  .index("by_key", ["eventKey"])

export const runtimeSandboxes = defineTable({
  tenantId: v.string(),
  runId: v.id("runs"),
  executionId: v.id("executions"),
  provider: v.literal("e2b"),
  sandboxId: v.string(),
  status: v.union(
    v.literal("created"),
    v.literal("running"),
    v.literal("reconnected"),
    v.literal("cleaned"),
    v.literal("failed")
  ),
  traceHost: v.optional(v.string()),
  lastError: v.optional(v.string()),
  createdAt: v.number(),
  updatedAt: v.number(),
  cleanedAt: v.optional(v.number()),
})
  .index("by_execution", ["executionId"])
  .index("by_run", ["runId"])
  .index("by_sandbox", ["sandboxId"])

export const runtimeSlackStatuses = defineTable({
  tenantId: v.string(),
  runId: v.id("runs"),
  integrationId: v.id("integrations"),
  channelId: v.string(),
  threadTs: v.string(),
  messageTs: v.optional(v.string()),
  state: v.union(
    v.literal("working"),
    v.literal("completed"),
    v.literal("failed")
  ),
  lastDeliveredState: v.optional(
    v.union(v.literal("working"), v.literal("completed"), v.literal("failed"))
  ),
  publishClaimUntil: v.optional(v.number()),
  lastError: v.optional(v.string()),
  deliveredAt: v.optional(v.number()),
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_run", ["runId"])
  .index("by_integration_and_channel", ["integrationId", "channelId"])
