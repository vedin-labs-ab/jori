import { readArray, readRecord } from "../../shared/input"
import { stripeRequest } from "../stripe/client"

export async function readCharge(chargeId: string) {
  const charge = await stripeRequest(
    `/v1/charges/${encodeURIComponent(chargeId)}`,
    { method: "GET" }
  )
  if (
    charge.id !== chargeId ||
    charge.status !== "succeeded" ||
    charge.paid !== true ||
    charge.disputed === true ||
    !Number.isSafeInteger(charge.amount) ||
    !Number.isSafeInteger(charge.amount_refunded) ||
    Number(charge.amount_refunded) < 0 ||
    Number(charge.amount) < Number(charge.amount_refunded)
  ) {
    throw new Error("Use a successful, undisputed original charge.")
  }
  return charge
}

export async function requireNoSubscriptions(customerId: string) {
  const result = await stripeRequest("/v1/subscriptions", {
    method: "GET",
    params: { customer: customerId, status: "all", limit: 100 },
  })
  if (
    result.has_more !== false ||
    readArray(result.data).some(
      (value) =>
        !["canceled", "incomplete_expired"].includes(
          String(readRecord(value).status)
        )
    )
  ) {
    throw new Error(
      "Cancel all subscriptions for this customer before refunding."
    )
  }
}

export async function chargeRefunds(chargeId: string) {
  const result = await stripeRequest("/v1/refunds", {
    method: "GET",
    params: { charge: chargeId, limit: 100 },
  })
  if (result.has_more !== false) {
    throw new Error(
      "Too many refunds to verify automatically; contact support engineering."
    )
  }
  return readArray(result.data).map(readRecord)
}

export function requireRefundMatch(
  refund: Record<string, unknown>,
  args: {
    refundId: string
    chargeId: string
    amountMinor: number
    currency: string
  }
) {
  if (
    refund.id !== args.refundId ||
    refund.charge !== args.chargeId ||
    refund.amount !== args.amountMinor ||
    refund.currency !== args.currency ||
    refund.status !== "succeeded"
  ) {
    throw new Error(
      "Stripe refund must have succeeded for this exact charge, currency and amount. Reserved credits remain held."
    )
  }
}

export async function requireNoPendingPayments(customerId: string) {
  const sessions = await stripeRequest("/v1/checkout/sessions", {
    method: "GET",
    params: { customer: customerId, status: "open", limit: 1 },
  })
  if (readArray(sessions.data).length > 0 || sessions.has_more !== false) {
    throw new Error("Expire open Checkout sessions in Stripe before refunding.")
  }
  const intents = await stripeRequest("/v1/payment_intents", {
    method: "GET",
    params: { customer: customerId, limit: 100 },
  })
  if (
    intents.has_more !== false ||
    readArray(intents.data).some((value) =>
      [
        "processing",
        "requires_action",
        "requires_capture",
        "requires_confirmation",
      ].includes(String(readRecord(value).status))
    )
  ) {
    throw new Error("Settle pending payments in Stripe before refunding.")
  }
}

export async function creditCandidates(
  charge: Record<string, unknown>,
  customerId: string
) {
  const intent = charge.payment_intent
  if (typeof intent !== "string") {
    throw new Error(
      "The wallet charge must identify its original PaymentIntent."
    )
  }
  const sessions = await stripeRequest("/v1/checkout/sessions", {
    method: "GET",
    params: { payment_intent: intent, limit: 100 },
  })
  if (sessions.has_more !== false) {
    throw new Error("Unable to identify the original top-up receipt.")
  }
  const matching = readArray(sessions.data)
    .map(readRecord)
    .filter(
      (session) =>
        session.payment_intent === intent &&
        session.customer === customerId &&
        session.payment_status === "paid"
    )
  return [
    intent,
    ...matching.flatMap((session) =>
      typeof session.id === "string" ? [session.id] : []
    ),
  ]
}
