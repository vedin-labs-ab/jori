import { v } from "convex/values"
import { termsVersion, topUp } from "../../../contracts/billing"
import { internal } from "../../_generated/api"
import { type Doc } from "../../_generated/dataModel"
import { type ActionCtx, action } from "../../_generated/server"
import { requireOrganizationAccess } from "../../access"
import { requireReturnUrl } from "../../shared/origin"
import { requireActivePlan, requireNoRefundHold } from "../account"
import { polarRequest, requireString } from "./client"
import {
  planProductId,
  polarMetadata,
  requirePolarConfiguration,
  topUpProductId,
} from "./config"

/**
 * The hosted-surface edge: checkout for subscribing and topping up, and the
 * customer portal for everything Polar manages better than we would (cards,
 * invoices, cancellation). Each action returns a URL the console redirects
 * to. Polar is the merchant of record, so tax is always part of checkout.
 */
export const startPlanCheckout = action({
  args: {
    organizationId: v.string(),
    returnUrl: v.string(),
    businessPurchase: v.literal(true),
    termsVersion: v.literal(termsVersion),
  },
  handler: async (ctx, args) => {
    await requireOrganizationAccess(ctx, args.organizationId)
    const returnUrl = requireReturnUrl(args.returnUrl)
    requirePolarConfiguration()
    requirePurchaseAgreement(args)

    const account = await ensuredAccount(ctx, args.organizationId)

    if (account.polar?.subscriptionId !== undefined) {
      throw new Error(
        "This organization already has a plan. Use Manage billing to change it."
      )
    }

    return await startCheckout(ctx, {
      organizationId: args.organizationId,
      returnUrl,
      status: "subscribed",
      kind: "plan",
      productId: planProductId(),
    })
  },
})

/**
 * Wallet top-ups are one-off payments. Amounts are the offered presets or any
 * whole-dollar amount from the minimum up, sold as a price made for this one
 * checkout; the wallet is credited with what the paid order says was charged
 * before tax.
 */
export const startTopUpCheckout = action({
  args: {
    organizationId: v.string(),
    amountUsd: v.number(),
    returnUrl: v.string(),
    businessPurchase: v.literal(true),
    termsVersion: v.literal(termsVersion),
  },
  handler: async (ctx, args) => {
    await requireOrganizationAccess(ctx, args.organizationId)
    const returnUrl = requireReturnUrl(args.returnUrl)
    requirePolarConfiguration()
    requirePurchaseAgreement(args)

    if (
      !Number.isInteger(args.amountUsd) ||
      args.amountUsd < topUp.minimumUsd ||
      args.amountUsd > topUp.maximumUsd
    ) {
      throw new Error(
        `Top up any whole amount from $${topUp.minimumUsd} to $${topUp.maximumUsd.toLocaleString("en-US")}.`
      )
    }

    requireActivePlan(await ensuredAccount(ctx, args.organizationId))

    return await startCheckout(ctx, {
      organizationId: args.organizationId,
      returnUrl,
      status: "topped-up",
      kind: "top-up",
      productId: topUpProductId(),
      amountUsd: args.amountUsd,
    })
  },
})

export const openPortal = action({
  args: { organizationId: v.string(), returnUrl: v.string() },
  handler: async (ctx, args) => {
    await requireOrganizationAccess(ctx, args.organizationId)
    const returnUrl = requireReturnUrl(args.returnUrl)
    requirePolarConfiguration()

    const account = await ensuredAccount(ctx, args.organizationId)

    if (account.polar === undefined) {
      throw new Error("Nothing to manage yet. Subscribe first.")
    }

    const session = await polarRequest("/v1/customer-sessions/", {
      method: "POST",
      body: { customer_id: account.polar.customerId, return_url: returnUrl },
    })

    return { url: requireString(session, "customer_portal_url") }
  },
})

/** The organization is the customer: Polar creates one under the
 *  organization's id at the first paid checkout and reuses it afterwards. */
async function startCheckout(
  ctx: ActionCtx,
  args: {
    organizationId: string
    returnUrl: string
    status: string
    kind: "plan" | "top-up"
    productId: string
    amountUsd?: number
  }
) {
  const identity = await ctx.auth.getUserIdentity()
  const metadata = polarMetadata({
    organizationId: args.organizationId,
    kind: args.kind,
    termsVersion,
    businessPurchase: "true",
  })
  const checkout = await polarRequest("/v1/checkouts/", {
    method: "POST",
    body: {
      products: [args.productId],
      ...(args.amountUsd === undefined
        ? {}
        : {
            prices: {
              [args.productId]: [
                {
                  amount_type: "fixed",
                  price_amount: args.amountUsd * 100,
                  price_currency: "usd",
                },
              ],
            },
          }),
      external_customer_id: args.organizationId,
      ...(identity?.email === undefined
        ? {}
        : { customer_email: identity.email }),
      customer_metadata: polarMetadata({
        organizationId: args.organizationId,
      }),
      metadata,
      currency: "usd",
      is_business_customer: true,
      require_billing_address: true,
      allow_discount_codes: false,
      success_url: billingReturnUrl(args.returnUrl, args.status),
      return_url: billingReturnUrl(args.returnUrl, "canceled"),
    },
  })

  return { url: requireString(checkout, "url") }
}

async function ensuredAccount(ctx: ActionCtx, organizationId: string) {
  const account: Doc<"accounts"> = await ctx.runMutation(
    internal.billing.polar.data.ensure,
    { organizationId }
  )

  requireNoRefundHold(account)
  return account
}

function billingReturnUrl(returnUrl: string, status: string) {
  const url = new URL(returnUrl)
  url.searchParams.set("billing", status)
  return url.toString()
}

function requirePurchaseAgreement(args: {
  businessPurchase: boolean
  termsVersion: string
}) {
  if (args.businessPurchase !== true || args.termsVersion !== termsVersion) {
    throw new Error(
      "Confirm business use and accept the current terms before purchasing."
    )
  }
}
