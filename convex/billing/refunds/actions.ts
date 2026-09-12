import { v } from "convex/values"
import { internal } from "../../_generated/api"
import { type Doc } from "../../_generated/dataModel"
import { internalAction } from "../../_generated/server"
import { stripeRequest } from "../stripe/client"
import { reservation } from "./schema"
import {
  chargeRefunds,
  creditCandidates,
  readCharge,
  requireNoPendingPayments,
  requireNoSubscriptions,
  requireRefundMatch,
} from "./stripe"
import { validateReservation } from "./validation"

/** Reserves credits, not money. Support performs the reviewed refund in Stripe. */
export const prepare = internalAction({
  args: reservation,
  handler: async (ctx, args): Promise<string> => {
    validateReservation(args)
    const existing: Doc<"billingRefunds"> | null = await ctx.runQuery(
      internal.billing.refunds.data.read,
      { caseId: args.caseId }
    )
    const charge = await readCharge(args.chargeId)
    const customerId = charge.customer
    if (typeof customerId !== "string" || charge.currency !== args.currency) {
      throw new Error("Charge customer or currency is invalid.")
    }
    await requireNoSubscriptions(customerId)
    await requireNoPendingPayments(customerId)
    const refunds = await chargeRefunds(args.chargeId)
    if (
      refunds.some(
        (refund) =>
          !["succeeded", "failed", "canceled"].includes(String(refund.status))
      )
    ) {
      throw new Error("Wait for pending Stripe refunds to settle.")
    }
    const priorRefundedMinor =
      existing?.priorRefundedMinor ?? Number(charge.amount_refunded)
    if (
      !Number.isSafeInteger(priorRefundedMinor) ||
      args.amountMinor + priorRefundedMinor > Number(charge.amount)
    ) {
      throw new Error("Refund exceeds the amount paid after prior refunds.")
    }
    const creditSourceId: string | undefined =
      args.walletMicros === 0
        ? undefined
        : await ctx.runQuery(internal.billing.refunds.purchase.source, {
            organizationId: args.organizationId,
            candidates: await creditCandidates(charge, customerId),
          })
    return await ctx.runMutation(internal.billing.refunds.data.reserve, {
      ...args,
      customerId,
      priorRefundedMinor,
      creditSourceId,
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
    const refund = await stripeRequest(
      `/v1/refunds/${encodeURIComponent(args.refundId)}`,
      { method: "GET" }
    )
    requireRefundMatch(refund, { ...entry, refundId: args.refundId })
    if (
      typeof refund.created !== "number" ||
      refund.created < Math.floor(entry.createdAt / 1000)
    ) {
      throw new Error(
        "The refund predates this reservation. Review the prior refund history."
      )
    }
    const charge = await readCharge(entry.chargeId)
    if (
      charge.customer !== entry.customerId ||
      Number(charge.amount_refunded) <
        entry.priorRefundedMinor + entry.amountMinor
    ) {
      throw new Error("Charge no longer matches the prepared refund.")
    }
    return await ctx.runMutation(internal.billing.refunds.data.settle, args)
  },
})

/** Releases a settled hold or restores a reservation proven not paid by Stripe. */
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
    if (entry?.status === "reserved") {
      const charge = await readCharge(entry.chargeId)
      const refunds = await chargeRefunds(entry.chargeId)
      if (
        charge.amount_refunded !== entry.priorRefundedMinor ||
        refunds.some(
          (refund) =>
            !["succeeded", "failed", "canceled"].includes(String(refund.status))
        )
      ) {
        throw new Error(
          "Refund may have been paid or is pending. Reconcile it before releasing credits."
        )
      }
    }
    return await ctx.runMutation(internal.billing.refunds.data.release, args)
  },
})
