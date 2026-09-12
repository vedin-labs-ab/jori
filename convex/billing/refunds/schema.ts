import { defineTable } from "convex/server"
import { v } from "convex/values"

export const reservation = {
  organizationId: v.string(),
  caseId: v.string(),
  chargeId: v.string(),
  amountMinor: v.number(),
  currency: v.string(),
  allowanceMicros: v.number(),
  walletMicros: v.number(),
  calculation: v.string(),
  operator: v.string(),
}

/** Accounting evidence only. Never put customer task content in calculation. */
export const billingRefunds = defineTable({
  ...reservation,
  customerId: v.string(),
  creditSourceId: v.optional(v.string()),
  priorRefundedMinor: v.number(),
  status: v.union(
    v.literal("reserved"),
    v.literal("refunded"),
    v.literal("released")
  ),
  refundId: v.optional(v.string()),
  createdAt: v.number(),
  resolvedAt: v.optional(v.number()),
})
  .index("by_caseId", ["caseId"])
  .index("by_refundId", ["refundId"])
  .index("by_chargeId", ["chargeId"])
  .index("by_creditSourceId", ["creditSourceId"])
  .index("by_organizationId", ["organizationId"])
