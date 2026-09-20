import { defineTable } from "convex/server"
import { type Infer, v } from "convex/values"

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

export const waiterCondition = v.union(
  v.object({ kind: v.literal("runs"), runIds: v.array(v.id("runs")) }),
  v.object({ kind: v.literal("command"), pid: v.string() })
)

/** The value the workflow event carries, so the resumed step knows why it
 *  woke and which waiter to name in its trace. */
export const waiterWake = v.object({
  reason: waiterReason,
  subject: v.optional(waiterSubject),
  waiter: v.id("waiters"),
})

export type WaiterReason = Infer<typeof waiterReason>
export type WaiterSubject = Infer<typeof waiterSubject>
export type WaiterCondition = Infer<typeof waiterCondition>
export type WaiterWake = Infer<typeof waiterWake>

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
  /** The workflow event the run's handler awaits while this waiter is open. */
  eventId: v.string(),
  /** The scheduled expiry, cancelled when the waiter wakes for another reason. */
  functionId: v.optional(v.id("_scheduled_functions")),
  /** The callback secret a sandbox command posts back with. */
  token: v.optional(v.string()),
  status: waiterStatus,
  expiresAt: v.number(),
  condition: v.optional(waiterCondition),
  reason: v.optional(waiterReason),
  subject: v.optional(waiterSubject),
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_run_and_status", ["runId", "status"])
  .index("by_token", ["token"])
