import { defineTable } from "convex/server"
import { v } from "convex/values"

const runtimeOperation = v.union(
  v.object({
    type: v.literal("run.start"),
    runId: v.id("runs"),
    parentRunId: v.optional(v.id("runs")),
    rootRunId: v.optional(v.id("runs")),
  }),
  v.object({
    type: v.literal("approval.resume"),
    approvalId: v.id("approvals"),
    decision: v.union(v.literal("approved"), v.literal("denied")),
    waitpointTokenId: v.string(),
  }),
  v.object({
    type: v.literal("run.cancel"),
    runId: v.id("runs"),
    sandboxId: v.optional(v.string()),
    triggerRunId: v.optional(v.string()),
  }),
  v.object({
    type: v.literal("reply.send"),
    kind: v.union(v.literal("quick"), v.literal("final")),
    messageId: v.id("messages"),
    routingId: v.id("routing"),
    text: v.string(),
  })
)

export const outbox = defineTable({
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

export const logs = defineTable({
  tenantId: v.string(),
  runId: v.id("runs"),
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

export const sandboxes = defineTable({
  tenantId: v.string(),
  runId: v.id("runs"),
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
  .index("by_run", ["runId"])
  .index("by_sandbox", ["sandboxId"])
