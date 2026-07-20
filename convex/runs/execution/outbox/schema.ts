import { defineTable } from "convex/server"
import { v } from "convex/values"
import { waiterReason, waiterSubject } from "../waiters/schema"

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
  organizationId: v.string(),
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
