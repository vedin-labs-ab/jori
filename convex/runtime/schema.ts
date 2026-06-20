import { defineTable } from "convex/server"
import { v } from "convex/values"

const runtimeOperation = v.union(
  v.object({
    type: v.literal("run.start"),
    runId: v.id("runs"),
  }),
  v.object({
    type: v.literal("approval.resume"),
    approvalId: v.id("approvals"),
    decision: v.union(v.literal("approved"), v.literal("denied")),
  }),
  v.object({
    type: v.literal("run.cancel"),
    runId: v.id("runs"),
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
  key: v.string(),
  status: v.union(
    v.literal("pending"),
    v.literal("processing"),
    v.literal("sent"),
    v.literal("failed")
  ),
  attempts: v.number(),
  dueAt: v.number(),
  error: v.optional(v.string()),
  receiptId: v.optional(v.string()),
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_status_and_due_at", ["status", "dueAt"])
  .index("by_key", ["key"])

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
