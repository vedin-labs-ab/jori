import { v } from "convex/values"
import { internal } from "../../_generated/api"
import { type Doc } from "../../_generated/dataModel"
import { internalAction } from "../../_generated/server"
import { readRecord } from "../../shared/input"
import { stripeRequest } from "./client"
import { belongsToRegion } from "./config"

export const cancel = internalAction({
  args: { id: v.id("billingCancellations") },
  handler: async (ctx, args) => {
    const row: Doc<"billingCancellations"> | null = await ctx.runQuery(
      internal.billing.stripe.cancellation.read,
      args
    )
    if (row === null || row.canceledAt !== undefined) {
      return
    }
    try {
      const session = await stripeRequest(
        `/v1/checkout/sessions/${encodeURIComponent(row.sessionId)}`,
        { method: "GET" }
      )
      if (
        session.id !== row.sessionId ||
        session.subscription !== row.subscriptionId ||
        session.customer !== row.customerId ||
        session.payment_status !== "paid" ||
        readRecord(session.metadata).organizationId !== row.organizationId ||
        !belongsToRegion(session)
      ) {
        throw new Error(
          "Late Checkout session does not match the recorded paid subscription."
        )
      }
      const path = `/v1/subscriptions/${encodeURIComponent(row.subscriptionId)}`
      const subscription = await stripeRequest(path, { method: "GET" })
      requireExactSubscription(subscription, row)
      if (
        subscription.status !== "canceled" &&
        subscription.status !== "incomplete_expired"
      ) {
        const canceled = await stripeRequest(path, {
          method: "DELETE",
          params: { invoice_now: false, prorate: false },
        })
        requireExactSubscription(canceled, row)
        if (canceled.status !== "canceled") {
          throw new Error("Stripe has not confirmed cancellation.")
        }
      }
      await ctx.runMutation(
        internal.billing.stripe.cancellation.completed,
        args
      )
    } catch (error) {
      await ctx.runMutation(internal.billing.stripe.cancellation.failed, {
        ...args,
        error:
          error instanceof Error
            ? error.message
            : "Subscription cancellation failed.",
      })
    }
  },
})

function requireExactSubscription(
  subscription: Record<string, unknown>,
  row: Doc<"billingCancellations">
) {
  if (
    subscription.id !== row.subscriptionId ||
    subscription.customer !== row.customerId ||
    readRecord(subscription.metadata).organizationId !== row.organizationId ||
    !belongsToRegion(subscription)
  ) {
    throw new Error(
      "Late subscription does not match the recorded workspace, customer and region."
    )
  }
}
