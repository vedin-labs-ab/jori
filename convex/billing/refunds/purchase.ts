import { type MutationCtx } from "../../_generated/server"
import { orderCases } from "./records"

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
    .withIndex("by_orderId_and_type", (q) =>
      q.eq("orderId", args.orderId).eq("type", "topup")
    )
    .unique()
  if (
    source?.type !== "topup" ||
    source.organizationId !== args.organizationId
  ) {
    throw new Error(
      "The order must be a top-up credited to this workspace. Wait for its webhook."
    )
  }
  const refunds = await orderCases(ctx, args.orderId)
  const reserved = refunds.reduce(
    (sum, refund) =>
      sum + (refund.status === "released" ? 0 : refund.walletMicros),
    0
  )
  const external = await ctx.db
    .query("transactions")
    .withIndex("by_orderId_and_type", (q) =>
      q.eq("orderId", args.orderId).eq("type", "refund")
    )
    .unique()
  if (
    args.walletMicros + reserved + (external?.micros.amount ?? 0) >
    source.micros.amount
  ) {
    throw new Error("Credits exceed this purchase after prior refunds.")
  }
}
