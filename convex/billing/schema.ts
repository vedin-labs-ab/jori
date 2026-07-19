import { defineTable } from "convex/server"
import { v } from "convex/values"

export const billingPlan = v.union(v.literal("starter"), v.literal("team"))
export const billingInterval = v.union(v.literal("month"), v.literal("year"))

/**
 * One row per tenant: plan state plus the two spendable balances, in integer
 * micro-dollars. `includedMicros` is the plan's monthly allotment and resets
 * each cycle; `walletMicros` is prepaid, rolls over, and may dip slightly
 * negative while in-flight runs finish. `autoTopUpHoldUntil` is the in-flight
 * claim for one auto top-up attempt: set while a charge is pending or cooling
 * down after a decline, so concurrent debits cannot double-charge.
 */
export const billingAccounts = defineTable({
  tenantId: v.string(),
  state: v.union(v.literal("trial"), v.literal("active"), v.literal("paused")),
  plan: v.optional(billingPlan),
  interval: v.optional(billingInterval),
  trialEndsAt: v.optional(v.number()),
  includedMicros: v.number(),
  walletMicros: v.number(),
  nextGrantAt: v.optional(v.number()),
  autoTopUp: v.optional(
    v.object({
      amountMicros: v.number(),
      monthlyCapMicros: v.number(),
    })
  ),
  autoTopUpUsedMicros: v.number(),
  autoTopUpHoldUntil: v.optional(v.number()),
  stripeCustomerId: v.optional(v.string()),
  stripeSubscriptionId: v.optional(v.string()),
  updatedAt: v.number(),
})
  .index("by_tenant", ["tenantId"])
  .index("by_next_grant", ["nextGrantAt"])
  .index("by_stripe_customer", ["stripeCustomerId"])

/**
 * The money history. Debit rows are one per run and accumulate as the run
 * progresses, so the feed reads as receipts rather than per-call noise.
 * `stripeId` on top-ups is the Stripe object that paid (checkout session or
 * payment intent) and doubles as the webhook idempotency key.
 *
 * `balanceMicros` is the available balance after the entry, so the feed reads
 * as a statement; `includedMicros` on debits is the portion drained from the
 * included allotment, attributing each run to its pot. Both are optional only
 * because rows written before they existed lack them.
 */
export const billingEntries = defineTable(
  v.union(
    v.object({
      tenantId: v.string(),
      timestamp: v.number(),
      type: v.literal("debit"),
      amountMicros: v.number(),
      includedMicros: v.optional(v.number()),
      balanceMicros: v.optional(v.number()),
      runId: v.id("runs"),
    }),
    v.object({
      tenantId: v.string(),
      timestamp: v.number(),
      type: v.literal("grant"),
      amountMicros: v.number(),
      balanceMicros: v.optional(v.number()),
      source: v.union(
        v.literal("trial"),
        v.literal("cycle"),
        v.literal("plan")
      ),
    }),
    v.object({
      tenantId: v.string(),
      timestamp: v.number(),
      type: v.literal("topup"),
      amountMicros: v.number(),
      balanceMicros: v.optional(v.number()),
      stripeId: v.string(),
      auto: v.boolean(),
    })
  )
)
  .index("by_tenant_and_timestamp", ["tenantId", "timestamp"])
  .index("by_run", ["runId"])
  .index("by_stripe", ["stripeId"])
