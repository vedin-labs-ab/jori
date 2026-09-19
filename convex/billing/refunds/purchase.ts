import { type MutationCtx } from "../../_generated/server"

/** Wallet credits can only be reserved against the top-up order that bought
 *  them, and never more of them than that order credited. */
export async function requireCreditedPurchase(
  ctx: MutationCtx,
  args: { organizationId: string; walletMicros: number; orderId: string }
) {
  if (args.walletMicros === 0) {
    return
  }
  const source = await ctx.db
    .query("transactions")
    .withIndex("by_order", (q) => q.eq("orderId", args.orderId))
    .unique()
  if (
    source?.type !== "topup" ||
    source.organizationId !== args.organizationId
  ) {
    throw new Error(
      "The order must be a top-up credited to this workspace. Wait for its webhook."
    )
  }
  const refunds = await ctx.db
    .query("billingRefunds")
    .withIndex("by_orderId", (q) => q.eq("orderId", args.orderId))
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
