import { v } from "convex/values"
import { termsVersion, topUp } from "../../../contracts/billing"
import { action } from "../../_generated/server"
import { requireOrganizationAccess } from "../../access"
import { requireReturnUrl } from "../../shared/origin"
import { requireActivePlan } from "../account"
import { polarList, polarRequest, requireString } from "./client"
import {
  planProductId,
  requirePolarConfiguration,
  topUpProductId,
} from "./config"

import {
  ensuredAccount,
  ensuredCustomer,
  requirePurchaseAgreement,
  startCheckout,
} from "./session"

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
      customerId: await ensuredCustomer(ctx, account),
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

    const account = await ensuredAccount(ctx, args.organizationId)
    requireActivePlan(account)

    return await startCheckout(ctx, {
      customerId: await ensuredCustomer(ctx, account),
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

    const customerId = account.polar.customerId
    const owners = await polarList(
      `/v1/customers/${encodeURIComponent(customerId)}/members`,
      { role: "owner" }
    )
    const owner = owners.find(
      (member) => member.customer_id === customerId && member.role === "owner"
    )
    if (owner === undefined) {
      throw new Error("The billing customer has no owner to open the portal.")
    }

    const session = await polarRequest("/v1/customer-sessions/", {
      method: "POST",
      body: {
        customer_id: customerId,
        member_id: requireString(owner, "id"),
        return_url: returnUrl,
      },
    })

    return { url: requireString(session, "customer_portal_url") }
  },
})
