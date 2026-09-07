import { v } from "convex/values"
import { autoTopUp, microsPerDollar } from "../../../contracts/billing"
import { internal } from "../../_generated/api"
import { type Doc } from "../../_generated/dataModel"
import { internalAction } from "../../_generated/server"
import { readArray, readString } from "../../shared/input"
import { stripeRequest } from "./client"
import { stripeMetadata } from "./config"

/**
 * Charges the saved card off-session after the meter claimed the top-up.
 * Success is credited by the payment_intent webhook so every dollar enters
 * through one path; failures here push the claim into a cooldown.
 */
export const execute = internalAction({
  args: { organizationId: v.string() },
  handler: async (ctx, args) => {
    const account: Doc<"accounts"> | null = await ctx.runQuery(
      internal.billing.stripe.data.read,
      { organizationId: args.organizationId }
    )
    const policy = account?.topUp.micros
    const customer = account?.stripe?.customerId

    if (
      account === null ||
      account.state.kind !== "active" ||
      policy === undefined ||
      customer === undefined ||
      account.topUp.charged.micros + policy.amount > policy.cap
    ) {
      return null
    }

    try {
      await chargeSavedCard({
        amountMicros: policy.amount,
        customer,
        releaseAt: account.topUp.charged.releaseAt ?? 0,
        organizationId: args.organizationId,
      })
    } catch {
      await ctx.runMutation(internal.billing.stripe.data.cooldown, {
        organizationId: args.organizationId,
        cooldownMs: autoTopUp.cooldownMs,
      })
    }

    return null
  },
})

async function chargeSavedCard(args: {
  amountMicros: number
  customer: string
  releaseAt: number
  organizationId: string
}) {
  const methods = await stripeRequest("/v1/payment_methods", {
    method: "GET",
    params: { customer: args.customer, type: "card", limit: 1 },
  })
  const paymentMethod = readString(readArray(methods.data)[0], "id")

  if (paymentMethod === undefined) {
    throw new Error("No saved card for auto top-up.")
  }

  await stripeRequest("/v1/payment_intents", {
    idempotencyKey: `auto-top-up-${args.organizationId}-${args.releaseAt}`,
    params: {
      amount: Math.round(args.amountMicros / (microsPerDollar / 100)),
      currency: "usd",
      customer: args.customer,
      payment_method: paymentMethod,
      off_session: true,
      confirm: true,
      metadata: stripeMetadata({
        kind: "auto-top-up",
        organizationId: args.organizationId,
        micros: String(args.amountMicros),
      }),
    },
  })
}
