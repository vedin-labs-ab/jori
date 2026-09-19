import { type QueryCtx } from "../../_generated/server"

export async function refundCase(ctx: QueryCtx, caseId: string) {
  return await ctx.db
    .query("billingRefunds")
    .withIndex("by_caseId", (q) => q.eq("caseId", caseId))
    .unique()
}

/** Both reservation and provider reconciliation must account for every case. */
export async function orderCases(ctx: QueryCtx, orderId: string) {
  const cases = await ctx.db
    .query("billingRefunds")
    .withIndex("by_orderId", (q) => q.eq("orderId", orderId))
    .take(1001)
  if (cases.length > 1000) {
    throw new Error("Too many refunds to verify this purchase.")
  }
  return cases
}
