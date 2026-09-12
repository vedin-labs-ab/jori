import { v } from "convex/values"
import { internalQuery, type MutationCtx } from "../../_generated/server"

export const source = internalQuery({
  args: { organizationId: v.string(), candidates: v.array(v.string()) },
  handler: async (ctx, args) => {
    if (args.candidates.length > 101) {
      throw new Error("Too many payment candidates.")
    }
    const matches: string[] = []
    for (const id of args.candidates) {
      const row = await ctx.db
        .query("transactions")
        .withIndex("by_stripe", (q) => q.eq("stripeId", id))
        .unique()
      if (row?.type === "topup" && row.organizationId === args.organizationId) {
        matches.push(id)
      }
    }
    if (matches.length !== 1) {
      throw new Error(
        "The original payment must have exactly one credited top-up receipt. Wait for its webhook."
      )
    }
    return matches[0]
  },
})

export async function requireCreditedPurchase(
  ctx: MutationCtx,
  args: {
    organizationId: string
    walletMicros: number
    creditSourceId?: string
  }
) {
  if (args.walletMicros === 0) {
    return
  }
  if (args.creditSourceId === undefined) {
    throw new Error("Original top-up receipt is required.")
  }
  const source = await ctx.db
    .query("transactions")
    .withIndex("by_stripe", (q) => q.eq("stripeId", args.creditSourceId))
    .unique()
  if (
    source?.type !== "topup" ||
    source.organizationId !== args.organizationId
  ) {
    throw new Error(
      "Original top-up receipt does not belong to this workspace."
    )
  }
  const refunds = await ctx.db
    .query("billingRefunds")
    .withIndex("by_creditSourceId", (q) =>
      q.eq("creditSourceId", args.creditSourceId)
    )
    .take(1001)
  if (refunds.length > 1000) {
    throw new Error("Too many refunds to verify this purchase.")
  }
  const reserved = refunds.reduce(
    (sum, refund) =>
      sum + (refund.status === "released" ? 0 : refund.walletMicros),
    0
  )
  if (args.walletMicros + reserved > source.micros.amount) {
    throw new Error("Credits exceed this purchase after prior refunds.")
  }
}
