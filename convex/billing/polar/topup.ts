import { v } from "convex/values"
import { autoTopUp, microsPerDollar } from "../../../contracts/billing"
import { internal } from "../../_generated/api"
import { type Doc } from "../../_generated/dataModel"
import { internalAction } from "../../_generated/server"
import { polarRequest, requireString } from "./client"
import { polarMetadata, topUpProductId } from "./config"

/**
 * Charges the saved card off-session after the meter claimed the top-up.
 * Success is credited by the paid order's webhook so every dollar enters
 * through one path; failures here push the claim into a cooldown.
 */
export const execute = internalAction({
  args: { organizationId: v.string() },
  handler: async (ctx, args) => {
    const account: Doc<"accounts"> | null = await ctx.runQuery(
      internal.billing.polar.data.read,
      { organizationId: args.organizationId }
    )
    const policy = account?.topUp.micros
    const customerId = account?.polar?.customerId

    if (
      account === null ||
      account.state.kind !== "active" ||
      account.refundHold !== undefined ||
      policy === undefined ||
      customerId === undefined ||
      account.topUp.charged.micros + policy.amount > policy.cap
    ) {
      return null
    }

    try {
      await chargeSavedCard({
        amountMicros: policy.amount,
        customerId,
        organizationId: args.organizationId,
      })
    } catch {
      await ctx.runMutation(internal.billing.polar.data.cooldown, {
        organizationId: args.organizationId,
        cooldownMs: autoTopUp.cooldownMs,
      })
    }

    return null
  },
})

/** Polar charges off-session in two steps: a draft order charges nothing,
 *  and finalizing it charges the customer's default payment method. A
 *  decline, or a card that wants a challenge nobody is present for, fails
 *  the finalize and leaves the draft unpaid. */
async function chargeSavedCard(args: {
  amountMicros: number
  customerId: string
  organizationId: string
}) {
  const order = await polarRequest("/v1/orders/", {
    method: "POST",
    body: {
      customer_id: args.customerId,
      product_id: topUpProductId(),
      amount: Math.round(args.amountMicros / (microsPerDollar / 100)),
      currency: "usd",
      description: "Jori usage auto top-up",
      metadata: polarMetadata({
        kind: "auto-top-up",
        organizationId: args.organizationId,
      }),
    },
  })

  await polarRequest(
    `/v1/orders/${encodeURIComponent(requireString(order, "id"))}/finalize`,
    { method: "POST" }
  )
}
