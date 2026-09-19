import { defineTable } from "convex/server"
import { v } from "convex/values"

/**
 * One row per organization: what the organization is paying for, plus the two
 * spendable pots in integer micro-dollars. `allowance` is the monthly
 * allotment and resets each cycle; `wallet` is prepaid, rolls over, and may
 * dip slightly negative while in-flight runs finish.
 *
 * A plan is only a fact once one is bought, so `state` carries it with the
 * shape it belongs to rather than leaving a reader to check optional columns
 * against a status. An organization that has bought nothing is unsubscribed
 * and can run nothing.
 */
export const accounts = defineTable({
  organizationId: v.string(),
  /** Internal support case holding new usage and purchases during settlement. */
  refundHold: v.optional(v.string()),
  refundHeldAt: v.optional(v.number()),
  state: v.union(
    v.object({ kind: v.literal("unsubscribed") }),
    v.object({ kind: v.literal("active") }),
    v.object({ kind: v.literal("paused") })
  ),
  micros: v.object({ allowance: v.number(), wallet: v.number() }),
  /** When the next cycle allowance lands. */
  renewsAt: v.optional(v.number()),
  topUp: v.object({
    /** The policy; absent when auto top-up is off. */
    micros: v.optional(
      v.object({
        threshold: v.number(),
        amount: v.number(),
        cap: v.number(),
      })
    ),
    // What auto top-up has charged against this month's cap, plus the claim
    // one attempt owns while a charge is pending or cooling down after a
    // decline, so concurrent debits cannot double-charge. Both outlive
    // switching the policy off.
    charged: v.object({
      micros: v.number(),
      releaseAt: v.optional(v.number()),
    }),
  }),
  /** Set by the first paid order; Polar keeps the customer under the
   *  organization's id. */
  polar: v.optional(
    v.object({
      customerId: v.string(),
      subscriptionId: v.optional(v.string()),
    })
  ),
  updatedAt: v.number(),
})
  .index("by_organization", ["organizationId"])
  .index("by_renewal", ["renewsAt"])

/**
 * The money history. Debit rows are one per run and accumulate as the run
 * progresses, so the feed reads as receipts rather than per-call noise, and
 * they carry the tokens the amount was made of: every prompt token, cached or
 * not, and completion tokens, reasoning included — the two quantities the rate
 * table prices. `micros.allowance` is the portion drained from the monthly
 * pot, attributing each run to its pot, and `micros.balance` is what remained
 * after the entry, so the feed reads as a statement.
 *
 * `orderId` on top-ups is the Polar order that paid and doubles as the
 * webhook idempotency key.
 */
export const transactions = defineTable(
  v.union(
    v.object({
      organizationId: v.string(),
      timestamp: v.number(),
      type: v.literal("debit"),
      micros: v.object({
        amount: v.number(),
        allowance: v.number(),
        balance: v.number(),
      }),
      tokens: v.object({ input: v.number(), output: v.number() }),
      runId: v.id("runs"),
    }),
    v.object({
      organizationId: v.string(),
      timestamp: v.number(),
      type: v.literal("allowance"),
      micros: v.object({ amount: v.number(), balance: v.number() }),
      source: v.union(v.literal("cycle"), v.literal("plan")),
    }),
    v.object({
      organizationId: v.string(),
      timestamp: v.number(),
      type: v.literal("allowance"),
      micros: v.object({ amount: v.number(), balance: v.number() }),
      source: v.literal("manual"),
      idempotencyKey: v.string(),
      reason: v.string(),
      operator: v.string(),
    }),
    v.object({
      organizationId: v.string(),
      timestamp: v.number(),
      type: v.literal("topup"),
      micros: v.object({ amount: v.number(), balance: v.number() }),
      orderId: v.string(),
      auto: v.boolean(),
    })
  )
)
  .index("by_organization_and_timestamp", ["organizationId", "timestamp"])
  .index("by_run", ["runId"])
  .index("by_order", ["orderId"])
  .index("by_idempotencyKey", ["idempotencyKey"])
