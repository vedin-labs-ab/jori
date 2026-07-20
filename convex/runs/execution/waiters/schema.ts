import { defineTable } from "convex/server"
import { v } from "convex/values"

export const waiterReason = v.union(
  v.literal("resolved"),
  v.literal("message"),
  v.literal("cancelled"),
  v.literal("expired")
)

export const waiterSubject = v.union(
  v.object({ kind: v.literal("approval"), id: v.id("approvals") }),
  v.object({ kind: v.literal("offer"), id: v.id("integrationOffers") }),
  v.object({ kind: v.literal("message"), id: v.id("messages") }),
  v.object({ kind: v.literal("run"), id: v.id("runs") })
)

export const waiterCondition = v.object({
  kind: v.literal("runs"),
  runIds: v.array(v.id("runs")),
})

const waiterStatus = v.union(
  v.literal("waiting"),
  v.literal("woken"),
  v.literal("cancelled"),
  v.literal("expired")
)

export const waiters = defineTable({
  organizationId: v.string(),
  runId: v.id("runs"),
  sessionId: v.optional(v.id("sessions")),
  waitpointId: v.string(),
  status: waiterStatus,
  expiresAt: v.number(),
  condition: v.optional(waiterCondition),
  reason: v.optional(waiterReason),
  subject: v.optional(waiterSubject),
  createdAt: v.number(),
  updatedAt: v.number(),
}).index("by_run_and_status", ["runId", "status"])
