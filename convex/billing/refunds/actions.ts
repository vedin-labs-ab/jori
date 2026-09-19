import { v } from "convex/values"
import { internal } from "../../_generated/api"
import { type Doc } from "../../_generated/dataModel"
import { internalAction } from "../../_generated/server"
import { polarList } from "../polar/client"
import {
  hasPendingRefund,
  orderRefunds,
  readOrder,
  requireNoPendingPayments,
  requireNoSubscriptions,
  requireRefundMatch,
} from "./polar"
import { reservation } from "./schema"
import { validateReservation } from "./validation"

/** Reserves credits, not money. Support performs the reviewed refund in Polar. */
export const prepare = internalAction({
  args: reservation,
  handler: async (ctx, args): Promise<string> => {
    validateReservation(args)
    const existing: Doc<"billingRefunds"> | null = await ctx.runQuery(
      internal.billing.refunds.data.read,
      { caseId: args.caseId }
    )
    const order = await readOrder(args.orderId)
    const customerId = order.customer_id
    if (typeof customerId !== "string" || order.currency !== args.currency) {
      throw new Error("Order customer or currency is invalid.")
    }
    await requireNoSubscriptions(customerId)
    await requireNoPendingPayments(customerId)
    if (hasPendingRefund(await orderRefunds(args.orderId))) {
      throw new Error("Wait for pending Polar refunds to settle.")
    }
    const priorRefundedMinor =
      existing?.priorRefundedMinor ?? Number(order.refunded_amount)
    if (
      !Number.isSafeInteger(priorRefundedMinor) ||
      args.amountMinor + priorRefundedMinor > Number(order.net_amount)
    ) {
      throw new Error("Refund exceeds the amount paid after prior refunds.")
    }
    return await ctx.runMutation(internal.billing.refunds.data.reserve, {
      ...args,
      customerId,
      priorRefundedMinor,
    })
  },
})

export const reconcile = internalAction({
  args: { caseId: v.string(), refundId: v.string() },
  handler: async (ctx, args): Promise<string> => {
    const entry: Doc<"billingRefunds"> | null = await ctx.runQuery(
      internal.billing.refunds.data.read,
      { caseId: args.caseId }
    )
    if (entry === null || entry.status === "released") {
      throw new Error("No reserved refund for this case.")
    }
    const [refund] = await polarList("/v1/refunds/", { id: args.refundId })
    requireRefundMatch(refund, { ...entry, refundId: args.refundId })
    if (Date.parse(String(refund?.created_at)) < entry.createdAt) {
      throw new Error(
        "The refund predates this reservation. Review the prior refund history."
      )
    }
    const order = await readOrder(entry.orderId)
    if (
      order.customer_id !== entry.customerId ||
      Number(order.refunded_amount) <
        entry.priorRefundedMinor + entry.amountMinor
    ) {
      throw new Error("Order no longer matches the prepared refund.")
    }
    const id = await ctx.runMutation(internal.billing.refunds.data.settle, args)
    await ctx.runMutation(internal.billing.polar.events.apply, { order })
    return id
  },
})

/** Releases a settled hold or restores a reservation proven not paid by Polar. */
export const release = internalAction({
  args: { organizationId: v.string(), caseId: v.string() },
  handler: async (ctx, args): Promise<null> => {
    const entry: Doc<"billingRefunds"> | null = await ctx.runQuery(
      internal.billing.refunds.data.read,
      { caseId: args.caseId }
    )
    if (entry !== null && entry.organizationId !== args.organizationId) {
      throw new Error("Case belongs to another workspace.")
    }
    const order = entry === null ? undefined : await readOrder(entry.orderId)
    if (entry !== null && order !== undefined) {
      if (
        entry.status === "reserved" &&
        (order.refunded_amount !== entry.priorRefundedMinor ||
          hasPendingRefund(await orderRefunds(entry.orderId)))
      ) {
        throw new Error(
          "Refund may have been paid or is pending. Reconcile it before releasing credits."
        )
      }
    }
    return await ctx.runMutation(internal.billing.refunds.data.release, {
      ...args,
      order,
    })
  },
})
