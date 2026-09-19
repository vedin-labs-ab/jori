import { v } from "convex/values"
import { internal } from "../../_generated/api"
import { type Doc } from "../../_generated/dataModel"
import { internalAction } from "../../_generated/server"
import { readRecord } from "../../shared/input"
import { polarRequest } from "./client"
import { belongsToRegion } from "./config"

export const cancel = internalAction({
  args: { id: v.id("billingCancellations") },
  handler: async (ctx, args) => {
    const row: Doc<"billingCancellations"> | null = await ctx.runQuery(
      internal.billing.polar.cancellation.read,
      args
    )
    if (row === null || row.canceledAt !== undefined) {
      return
    }
    try {
      const order = await polarRequest(
        `/v1/orders/${encodeURIComponent(row.orderId)}`
      )
      if (
        order.id !== row.orderId ||
        order.subscription_id !== row.subscriptionId ||
        order.customer_id !== row.customerId ||
        order.paid !== true ||
        readRecord(order.metadata).organizationId !== row.organizationId ||
        !belongsToRegion(order)
      ) {
        throw new Error(
          "Late order does not match the recorded paid subscription."
        )
      }
      const path = `/v1/subscriptions/${encodeURIComponent(row.subscriptionId)}`
      const subscription = await polarRequest(path)
      requireExactSubscription(subscription, row)
      if (
        subscription.status !== "canceled" &&
        subscription.status !== "incomplete_expired"
      ) {
        const canceled = await polarRequest(path, { method: "DELETE" })
        requireExactSubscription(canceled, row)
        if (canceled.status !== "canceled") {
          throw new Error("Polar has not confirmed cancellation.")
        }
      }
      await ctx.runMutation(internal.billing.polar.cancellation.completed, args)
    } catch (error) {
      await ctx.runMutation(internal.billing.polar.cancellation.failed, {
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
    subscription.customer_id !== row.customerId ||
    readRecord(subscription.metadata).organizationId !== row.organizationId ||
    !belongsToRegion(subscription)
  ) {
    throw new Error(
      "Late subscription does not match the recorded workspace, customer and region."
    )
  }
}
