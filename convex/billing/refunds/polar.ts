import { polarList, polarRequest } from "../polar/client"

const settledRefunds = ["succeeded", "failed", "canceled"]

/** The order that was paid. Amounts are before tax: Polar refunds the tax
 *  that belongs to a refunded amount on its own. */
export async function readOrder(orderId: string) {
  const order = await polarRequest(`/v1/orders/${encodeURIComponent(orderId)}`)
  if (
    order.id !== orderId ||
    order.paid !== true ||
    !["paid", "partially_refunded", "refunded"].includes(
      String(order.status)
    ) ||
    !Number.isSafeInteger(order.net_amount) ||
    !Number.isSafeInteger(order.refunded_amount) ||
    Number(order.refunded_amount) < 0 ||
    Number(order.net_amount) < Number(order.refunded_amount)
  ) {
    throw new Error("Use a paid original order.")
  }
  return order
}

export async function requireNoSubscriptions(customerId: string) {
  const subscriptions = await polarList("/v1/subscriptions/", {
    customer_id: customerId,
  })
  if (
    subscriptions.some(
      (subscription) =>
        !["canceled", "incomplete_expired"].includes(
          String(subscription.status)
        )
    )
  ) {
    throw new Error(
      "Cancel all subscriptions for this customer before refunding."
    )
  }
}

export async function orderRefunds(orderId: string) {
  return await polarList("/v1/refunds/", { order_id: orderId })
}

export function hasPendingRefund(refunds: Record<string, unknown>[]) {
  return refunds.some(
    (refund) => !settledRefunds.includes(String(refund.status))
  )
}

export function requireRefundMatch(
  refund: Record<string, unknown> | undefined,
  args: {
    refundId: string
    orderId: string
    amountMinor: number
    currency: string
  }
) {
  if (
    refund?.id !== args.refundId ||
    refund.order_id !== args.orderId ||
    refund.amount !== args.amountMinor ||
    refund.currency !== args.currency ||
    refund.status !== "succeeded"
  ) {
    throw new Error(
      "Polar refund must have succeeded for this exact order, currency and amount. Reserved credits remain held."
    )
  }
}

export async function requireNoPendingPayments(customerId: string) {
  const checkouts = await polarList("/v1/checkouts/", {
    customer_id: customerId,
    status: ["open", "confirmed"],
  })
  if (checkouts.length > 0) {
    throw new Error("Wait for open checkouts to expire before refunding.")
  }
  const orders = await polarList("/v1/orders/", {
    customer_id: customerId,
    status: "pending",
  })
  if (orders.length > 0) {
    throw new Error("Settle pending payments in Polar before refunding.")
  }
}
