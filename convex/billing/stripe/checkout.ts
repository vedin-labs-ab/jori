import { v } from "convex/values"
import { dollarsToMicros, topUp } from "../../../contracts/billing"
import { internal } from "../../_generated/api"
import { type Doc } from "../../_generated/dataModel"
import { type ActionCtx, action } from "../../_generated/server"
import { requireOrganizationAccess } from "../../access"
import { billingInterval, billingPlan } from "../schema"
import { requireString, stripeRequest } from "./client"
import { stripePriceId } from "./config"

/**
 * The hosted-surface edge: checkout for subscribing and topping up, and the
 * customer portal for everything Stripe manages better than we would (cards,
 * invoices, plan switches, cancellation). Each action returns a URL the
 * console redirects to.
 */
export const startPlanCheckout = action({
  args: {
    organizationId: v.string(),
    plan: billingPlan,
    interval: billingInterval,
    returnUrl: v.string(),
  },
  handler: async (ctx, args) => {
    await requireOrganizationAccess(ctx, args.organizationId)

    const account = await ensuredAccount(ctx, args.organizationId)

    if (account.stripeSubscriptionId !== undefined) {
      throw new Error(
        "This organization already has a plan. Use Manage billing to change it."
      )
    }

    const customer = await ensuredCustomer(ctx, args.organizationId, account)
    const session = await stripeRequest("/v1/checkout/sessions", {
      params: {
        mode: "subscription",
        customer,
        success_url: `${args.returnUrl}?billing=subscribed`,
        cancel_url: `${args.returnUrl}?billing=canceled`,
        line_items: {
          "0": { price: stripePriceId(args.plan, args.interval), quantity: 1 },
        },
        metadata: {
          organizationId: args.organizationId,
          kind: "plan",
          plan: args.plan,
          interval: args.interval,
        },
        subscription_data: {
          metadata: { organizationId: args.organizationId },
        },
        automatic_tax: { enabled: true },
        tax_id_collection: { enabled: true },
        billing_address_collection: "required",
        customer_update: { address: "auto", name: "auto" },
      },
    })

    return { url: requireString(session, "url") }
  },
})

/**
 * Wallet top-ups are one-off payments that also save the card for auto
 * top-ups. Amounts are the offered presets or any whole-dollar amount from
 * the minimum up; the credited value is carried in metadata so the webhook
 * never has to reason about taxes or currency.
 */
export const startTopUpCheckout = action({
  args: {
    organizationId: v.string(),
    amountUsd: v.number(),
    returnUrl: v.string(),
  },
  handler: async (ctx, args) => {
    await requireOrganizationAccess(ctx, args.organizationId)

    if (
      !Number.isInteger(args.amountUsd) ||
      args.amountUsd < topUp.minimumUsd ||
      args.amountUsd > topUp.maximumUsd
    ) {
      throw new Error(
        `Top up any whole amount from $${topUp.minimumUsd} to $${topUp.maximumUsd.toLocaleString("en-US")}.`
      )
    }

    const account = await ensuredAccount(ctx, args.organizationId)
    const customer = await ensuredCustomer(ctx, args.organizationId, account)
    const micros = dollarsToMicros(args.amountUsd)
    const session = await stripeRequest("/v1/checkout/sessions", {
      params: {
        mode: "payment",
        customer,
        success_url: `${args.returnUrl}?billing=topped-up`,
        cancel_url: `${args.returnUrl}?billing=canceled`,
        line_items: {
          "0": {
            price_data: {
              currency: "usd",
              product_data: { name: "Milo usage top-up" },
              unit_amount: args.amountUsd * 100,
            },
            quantity: 1,
          },
        },
        payment_intent_data: { setup_future_usage: "off_session" },
        metadata: {
          organizationId: args.organizationId,
          kind: "top-up",
          micros: String(micros),
        },
      },
    })

    return { url: requireString(session, "url") }
  },
})

export const openPortal = action({
  args: { organizationId: v.string(), returnUrl: v.string() },
  handler: async (ctx, args) => {
    await requireOrganizationAccess(ctx, args.organizationId)

    const account = await ensuredAccount(ctx, args.organizationId)

    if (account.stripeCustomerId === undefined) {
      throw new Error("Nothing to manage yet. Subscribe or top up first.")
    }

    const session = await stripeRequest("/v1/billing_portal/sessions", {
      params: {
        customer: account.stripeCustomerId,
        return_url: args.returnUrl,
      },
    })

    return { url: requireString(session, "url") }
  },
})

async function ensuredAccount(ctx: ActionCtx, organizationId: string) {
  const account: Doc<"billingAccounts"> = await ctx.runMutation(
    internal.billing.stripe.data.ensure,
    { organizationId }
  )

  return account
}

async function ensuredCustomer(
  ctx: ActionCtx,
  organizationId: string,
  account: Doc<"billingAccounts">
) {
  if (account.stripeCustomerId !== undefined) {
    return account.stripeCustomerId
  }

  const identity = await ctx.auth.getUserIdentity()
  const customer = await stripeRequest("/v1/customers", {
    params: {
      ...(identity?.email === undefined ? {} : { email: identity.email }),
      metadata: { organizationId },
    },
  })
  const customerId = requireString(customer, "id")

  await ctx.runMutation(internal.billing.stripe.data.attachCustomer, {
    organizationId,
    stripeCustomerId: customerId,
  })

  return customerId
}
