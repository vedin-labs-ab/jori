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
  v.object({ kind: v.literal("message"), id: v.id("messages") })
)

const waiterStatus = v.union(
  v.literal("waiting"),
  v.literal("woken"),
  v.literal("cancelled"),
  v.literal("expired")
)

export const waiters = defineTable({
  tenantId: v.string(),
  runId: v.id("runs"),
  sessionId: v.optional(v.id("sessions")),
  waitpointId: v.string(),
  status: waiterStatus,
  expiresAt: v.number(),
  reason: v.optional(waiterReason),
  subject: v.optional(waiterSubject),
  createdAt: v.number(),
  updatedAt: v.number(),
  wokenAt: v.optional(v.number()),
})
  .index("by_run_and_status", ["runId", "status"])
  .index("by_waitpoint", ["waitpointId"])
  .index("by_session_and_status", ["sessionId", "status"])
