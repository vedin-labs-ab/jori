import { defineTable } from "convex/server"
import { v } from "convex/values"

/** Late subscriptions never grant access; preserve references for refund support. */
export const billingCancellations = defineTable({
  organizationId: v.string(),
  customerId: v.string(),
  subscriptionId: v.string(),
  orderId: v.string(),
  createdAt: v.number(),
  canceledAt: v.optional(v.number()),
  nextAt: v.optional(v.number()),
  error: v.optional(v.string()),
})
  .index("by_subscriptionId", ["subscriptionId"])
  .index("by_organizationId", ["organizationId"])
  .index("by_nextAt", ["nextAt"])
