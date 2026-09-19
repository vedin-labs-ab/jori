import { v } from "convex/values"
import { termsVersion } from "../../../contracts/billing"
import { internal } from "../../_generated/api"
import { action } from "../../_generated/server"
import { requireOrganizationAccess } from "../../access"
import { requireReturnUrl } from "../../shared/origin"
import { requireActivePlan } from "../account"
import { polarRequest } from "../polar/client"
import { requirePolarConfiguration } from "../polar/config"
import {
  ensuredAccount,
  ensuredCustomer,
  requirePurchaseAgreement,
  startCheckout,
} from "../polar/session"
import { requireExtraGb, storageProductId, validExtraGb } from "./config"
import { matchesStorageSubscription } from "./sync"

const purchaseArgs = {
  organizationId: v.string(),
  extraGb: v.number(),
  businessPurchase: v.literal(true),
  termsVersion: v.literal(termsVersion),
}

export const checkout = action({
  args: { ...purchaseArgs, returnUrl: v.string() },
  returns: v.object({ url: v.string() }),
  handler: async (ctx, args) => {
    await requireOrganizationAccess(ctx, args.organizationId)
    const returnUrl = requireReturnUrl(args.returnUrl)
    requirePurchaseAgreement(args)
    requireExtraGb(args.extraGb)
    requirePolarConfiguration()
    const productId = storageProductId()
    const account = await ensuredAccount(ctx, args.organizationId)
    requireActivePlan(account)
    if (account.storage !== undefined) {
      throw new Error(
        "This workspace already has extra storage. Change its capacity instead."
      )
    }
    return await startCheckout(ctx, {
      customerId: await ensuredCustomer(ctx, account),
      organizationId: args.organizationId,
      returnUrl,
      status: "storage",
      kind: "storage",
      productId,
      units: args.extraGb,
    })
  },
})

export const change = action({
  args: purchaseArgs,
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireOrganizationAccess(ctx, args.organizationId)
    requirePurchaseAgreement(args)
    if (args.extraGb !== 0) {
      requireExtraGb(args.extraGb)
    }
    requirePolarConfiguration()
    const account = await ensuredAccount(ctx, args.organizationId)
    requireActivePlan(account)
    if (account.storage === undefined) {
      throw new Error("Purchase extra storage before changing its capacity.")
    }
    const path = `/v1/subscriptions/${encodeURIComponent(account.storage.subscriptionId)}`
    const current = await polarRequest(path)
    if (
      !matchesStorageSubscription(account, current) ||
      current.id !== account.storage.subscriptionId ||
      !(
        current.status === "active" ||
        (args.extraGb === 0 && current.status === "past_due")
      ) ||
      !validExtraGb(current.units)
    ) {
      throw new Error(
        "Extra storage is not active. Check Manage billing before changing it."
      )
    }
    // Each upgrade collects payment before Polar changes units. Downgrades
    // preserve the capacity already paid for until the next billing period.
    if (current.cancel_at_period_end === true && args.extraGb !== 0) {
      throw new Error(
        "Resume extra storage in Manage billing before changing its capacity."
      )
    }
    const subscription = await polarRequest(path, {
      method: "PATCH",
      body:
        args.extraGb === 0
          ? { cancel_at_period_end: true }
          : {
              units: args.extraGb,
              proration_behavior:
                args.extraGb > Number(current.units)
                  ? "invoice"
                  : "next_period",
            },
    })
    if (
      !matchesStorageSubscription(account, subscription) ||
      subscription.id !== account.storage.subscriptionId
    ) {
      throw new Error(
        "Polar returned a storage subscription for another workspace."
      )
    }
    await ctx.runMutation(internal.billing.polar.events.apply, { subscription })
    return null
  },
})
