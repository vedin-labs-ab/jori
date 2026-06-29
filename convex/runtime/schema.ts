import { defineTable } from "convex/server"
import { v } from "convex/values"
import { toolSnapshot } from "../runs/schema"
import { waiterReason, waiterSubject } from "./waiters/schema"

const runtimeOperation = v.union(
  v.object({
    type: v.literal("run.start"),
    runId: v.id("runs"),
  }),
  v.object({
    type: v.literal("run.cancel"),
    runId: v.id("runs"),
  }),
  v.object({
    type: v.literal("waiter.wake"),
    waiterId: v.id("waiters"),
    reason: waiterReason,
    subject: v.optional(waiterSubject),
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
  v.literal("trigger.model"),
  v.literal("trigger.run"),
  v.literal("trigger.tool")
)

export const traceType = v.union(
  v.literal("agent.started"),
  v.literal("approval.requested"),
  v.literal("approval.resolved"),
  v.literal("asset.saved"),
  v.literal("model.completed"),
  v.literal("model.failed"),
  v.literal("model.started"),
  v.literal("offer.requested"),
  v.literal("offer.resolved"),
  v.literal("run.completed"),
  v.literal("run.failed"),
  v.literal("run.prepared"),
  v.literal("run.resumed"),
  v.literal("run.started"),
  v.literal("run.waiting"),
  v.literal("tool.completed"),
  v.literal("tool.failed"),
  v.literal("tool.started"),
  v.literal("tool.waiting")
)

const traceToolRoute = v.union(
  v.literal("agent"),
  v.literal("active_surface"),
  v.literal("convex"),
  v.literal("run"),
  v.literal("sandbox")
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

const traceToolInputSummary = v.object({
  args: v.optional(v.array(v.string())),
  command: v.optional(v.string()),
  cwd: v.optional(v.string()),
  directory: v.optional(v.string()),
  include: v.optional(v.string()),
  limit: v.optional(v.number()),
  offset: v.optional(v.number()),
  owner: v.optional(v.string()),
  path: v.optional(v.string()),
  pattern: v.optional(v.string()),
  ref: v.optional(v.string()),
  repo: v.optional(v.string()),
  timeoutMs: v.optional(v.number()),
})

const traceSubject = v.union(
  v.object({ kind: v.literal("agent"), id: v.id("runs") }),
  v.object({ kind: v.literal("approval"), id: v.id("approvals") }),
  v.object({ kind: v.literal("asset"), id: v.id("assets") }),
  v.object({ kind: v.literal("offer"), id: v.id("integrationOffers") }),
  v.object({ kind: v.literal("waiter"), id: v.id("waiters") })
)

const traceMetricSummary = v.object({
  approvals: v.optional(v.number()),
  durationMs: v.optional(v.number()),
  inputTokens: v.optional(v.number()),
  messages: v.optional(v.number()),
  offers: v.optional(v.number()),
  outputTokens: v.optional(v.number()),
  reasoningTokens: v.optional(v.number()),
  toolCalls: v.optional(v.number()),
  totalTokens: v.optional(v.number()),
})

const traceEventStatus = v.union(
  v.literal("approved"),
  v.literal("cancelled"),
  v.literal("completed"),
  v.literal("connected"),
  v.literal("denied"),
  v.literal("expired"),
  v.literal("failed"),
  v.literal("pending"),
  v.literal("requested"),
  v.literal("running"),
  v.literal("stopped"),
  v.literal("waiting")
)

const traceEventData = v.object({
  metrics: v.optional(traceMetricSummary),
  status: v.optional(traceEventStatus),
  subject: v.optional(traceSubject),
  summary: v.optional(v.string()),
  title: v.string(),
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
    input: v.optional(traceToolInputSummary),
    result: v.optional(traceValueSummary),
  }),
  v.object({
    promptId: v.optional(v.id("_storage")),
    tools: toolSnapshot,
  }),
  traceEventData
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
