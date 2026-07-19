import { v } from "convex/values"
import { autoTopUp, microsPerDollar } from "../../../contracts/billing"
import { internal } from "../../_generated/api"
import { type Doc } from "../../_generated/dataModel"
import { internalAction } from "../../_generated/server"
import { readArray, readString } from "../../shared/input"
import { stripeRequest } from "./client"

/**
 * Charges the saved card off-session after the meter claimed the top-up hold.
 * Success is credited by the payment_intent webhook so every dollar enters
 * through one path; failures here push the hold into a cooldown.
 */
export const execute = internalAction({
  args: { tenantId: v.string() },
  handler: async (ctx, args) => {
    const account: Doc<"billingAccounts"> | null = await ctx.runQuery(
      internal.billing.stripe.data.read,
      { tenantId: args.tenantId }
    )
    const config = account?.autoTopUp
    const customer = account?.stripeCustomerId

    if (
      account === null ||
      config === undefined ||
      customer === undefined ||
      account.autoTopUpUsedMicros + config.amountMicros >
        config.monthlyCapMicros
    ) {
      return null
    }

    try {
      await chargeSavedCard({
        amountMicros: config.amountMicros,
        customer,
        holdUntil: account.autoTopUpHoldUntil ?? 0,
        tenantId: args.tenantId,
      })
    } catch {
      await ctx.runMutation(internal.billing.stripe.data.cooldown, {
        tenantId: args.tenantId,
        cooldownMs: autoTopUp.cooldownMs,
      })
    }

    return null
  },
})

async function chargeSavedCard(args: {
  amountMicros: number
  customer: string
  holdUntil: number
  tenantId: string
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
    idempotencyKey: `auto-top-up-${args.tenantId}-${args.holdUntil}`,
    params: {
      amount: Math.round(args.amountMicros / (microsPerDollar / 100)),
      currency: "usd",
      customer: args.customer,
      payment_method: paymentMethod,
      off_session: true,
      confirm: true,
      metadata: {
        kind: "auto-top-up",
        tenantId: args.tenantId,
        micros: String(args.amountMicros),
      },
    },
  })
}
