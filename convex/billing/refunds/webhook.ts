import { microsPerDollar } from "../../../contracts/billing"
import { type Id } from "../../_generated/dataModel"
import { type MutationCtx } from "../../_generated/server"
import { readNumber, readString } from "../../shared/input"

/** Reconcile Polar's cumulative, pre-tax refund against this order's ledger.
 * Support removes its reviewed credits when reserving, so wait for the case
 * to identify its refund before debiting anything else. The hold blocks work.
 */
export async function applyTopUpRefund(
  ctx: MutationCtx,
  accountId: Id<"accounts">,
  order: Record<string, unknown>
) {
  const refunded = readNumber(order, "refunded_amount") ?? 0
  const orderId = readString(order, "id")
  if (refunded === 0 || orderId === undefined) {
    return
  }
  if (
    !Number.isSafeInteger(refunded) ||
    refunded < 0 ||
    refunded > Number(order.net_amount) ||
    !Number.isSafeInteger(refunded * (microsPerDollar / 100))
  ) {
    throw new Error("Polar returned an invalid refunded amount.")
  }
  const cases = await ctx.db
    .query("billingRefunds")
    .withIndex("by_orderId", (q) => q.eq("orderId", orderId))
    .take(1001)
  if (cases.length > 1000) {
    throw new Error("Too many refunds to verify this purchase.")
  }
  if (cases.some((entry) => entry.status === "reserved")) {
    return
  }
  const supported = cases.reduce(
    (sum, entry) => sum + (entry.status === "refunded" ? entry.amountMinor : 0),
    0
  )
  const amount = Math.max(0, refunded - supported) * (microsPerDollar / 100)
  await debitRefund(ctx, accountId, orderId, amount)
}

async function debitRefund(
  ctx: MutationCtx,
  accountId: Id<"accounts">,
  orderId: string,
  amount: number
) {
  const existing = await ctx.db
    .query("transactions")
    .withIndex("by_orderId_and_type", (q) =>
      q.eq("orderId", orderId).eq("type", "refund")
    )
    .unique()
  const delta = amount - (existing?.micros.amount ?? 0)
  if (delta <= 0) {
    return
  }
  // Payment and refund may arrive together; read the balance after crediting.
  const account = await ctx.db.get(accountId)
  if (account === null) {
    throw new Error("Billing account not found.")
  }
  const purchase = await ctx.db
    .query("transactions")
    .withIndex("by_orderId_and_type", (q) =>
      q.eq("orderId", orderId).eq("type", "topup")
    )
    .unique()
  if (
    purchase?.organizationId !== account.organizationId ||
    amount > purchase.micros.amount
  ) {
    throw new Error("Refund must match this workspace's credited purchase.")
  }
  const wallet = account.micros.wallet - delta
  const balance = account.micros.allowance + wallet
  if (!Number.isSafeInteger(wallet) || !Number.isSafeInteger(balance)) {
    throw new Error("Unsafe refunded balance.")
  }
  const timestamp = Date.now()
  await ctx.db.patch(accountId, {
    micros: { ...account.micros, wallet },
    updatedAt: timestamp,
  })
  const micros = { amount, balance }
  if (existing !== null) {
    await ctx.db.patch(existing._id, { micros, timestamp })
  } else {
    await ctx.db.insert("transactions", {
      organizationId: account.organizationId,
      type: "refund",
      orderId,
      micros,
      timestamp,
    })
  }
}
