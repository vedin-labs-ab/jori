import { defineTable } from "convex/server"
import { v } from "convex/values"
import { toolSnapshot } from "../runs/schema"

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

export const traceSource = v.union(
  v.literal("convex.runtime"),
  v.literal("trigger.approval"),
  v.literal("trigger.run"),
  v.literal("trigger.tool")
)

export const traceType = v.union(
  v.literal("run.completed"),
  v.literal("run.failed"),
  v.literal("run.prepared"),
  v.literal("run.started"),
  v.literal("tool.completed"),
  v.literal("tool.failed"),
  v.literal("tool.started"),
  v.literal("tool.waiting")
)

const traceToolRoute = v.union(
  v.literal("convex"),
  v.literal("sandbox"),
  v.literal("subagent")
)
const traceToolAccess = v.union(v.literal("read"), v.literal("write"))

const traceValueSummary = v.object({
  type: v.union(
    v.literal("array"),
    v.literal("boolean"),
    v.literal("null"),
    v.literal("number"),
    v.literal("object"),
    v.literal("string")
  ),
  preview: v.optional(v.string()),
  size: v.optional(v.number()),
})

export const traceData = v.union(
  v.object({
    error: v.string(),
  }),
  v.object({
    access: v.optional(traceToolAccess),
    name: v.string(),
    route: traceToolRoute,
    error: v.optional(v.string()),
    providerTrace: v.optional(
      v.object({
        provider: v.string(),
        requestId: v.string(),
      })
    ),
    result: v.optional(traceValueSummary),
  }),
  v.object({
    promptId: v.id("_storage"),
    tools: toolSnapshot,
  })
)

export const traces = defineTable({
  tenantId: v.string(),
  runId: v.id("runs"),
  key: v.string(),
  source: traceSource,
  type: traceType,
  sequence: v.optional(v.number()),
  callId: v.optional(v.string()),
  attempt: v.optional(v.number()),
  data: v.optional(traceData),
  timestamp: v.number(),
})
  .index("by_run_and_timestamp", ["runId", "timestamp"])
  .index("by_key", ["key"])

export const sandboxes = defineTable({
  tenantId: v.string(),
  runId: v.id("runs"),
  externalId: v.string(),
  status: v.union(
    v.literal("active"),
    v.literal("idle"),
    v.literal("cleaned"),
    v.literal("failed")
  ),
  watchId: v.optional(v.id("watches")),
  expiresAt: v.optional(v.number()),
  error: v.optional(v.string()),
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_run_and_status", ["runId", "status"])
  .index("by_external_id", ["externalId"])
  .index("by_tenant_and_watch_and_status_and_expires_at", [
    "tenantId",
    "watchId",
    "status",
    "expiresAt",
  ])
