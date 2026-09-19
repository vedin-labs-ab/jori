import { termsVersion } from "../../../../contracts/billing"
import { internal } from "../../../_generated/api"
import { type Doc } from "../../../_generated/dataModel"
import { type ActionCtx } from "../../../_generated/server"
import { requireNoRefundHold } from "../../account"
import { polarRequest, requireString } from "../client"
import { polarMetadata } from "../config"
import { recurringCheckout } from "./recurring"

export type CheckoutArgs = {
  customerId: string
  organizationId: string
  returnUrl: string
  status: string
  kind: "plan" | "top-up" | "storage"
  productId: string
  amountUsd?: number
  units?: number
}

export async function startCheckout(ctx: ActionCtx, args: CheckoutArgs) {
  if (args.kind !== "top-up") {
    return await recurringCheckout(
      ctx,
      args,
      async (attempt) => await createCheckout(args, attempt)
    )
  }
  const checkout = await createCheckout(args)
  return { url: requireString(checkout, "url") }
}

async function createCheckout(args: CheckoutArgs, attempt?: string) {
  const metadata = polarMetadata({
    organizationId: args.organizationId,
    kind: args.kind,
    termsVersion,
    businessPurchase: "true",
    ...(attempt === undefined ? {} : { checkoutAttempt: attempt }),
  })
  const checkout = await polarRequest("/v1/checkouts/", {
    method: "POST",
    body: {
      products: [args.productId],
      ...(args.units === undefined ? {} : { units: args.units }),
      ...(args.amountUsd === undefined
        ? {}
        : {
            prices: {
              [args.productId]: [
                {
                  amount_type: "fixed",
                  price_amount: args.amountUsd * 100,
                  price_currency: "usd",
                  tax_behavior: "exclusive",
                },
              ],
            },
          }),
      customer_id: args.customerId,
      metadata,
      currency: "usd",
      is_business_customer: true,
      require_billing_address: true,
      allow_discount_codes: false,
      success_url: billingReturnUrl(args.returnUrl, args.status),
      return_url: billingReturnUrl(args.returnUrl, "canceled"),
    },
  })

  return checkout
}

export async function ensuredAccount(ctx: ActionCtx, organizationId: string) {
  const account: Doc<"accounts"> = await ctx.runMutation(
    internal.billing.polar.data.ensure,
    { organizationId }
  )

  requireNoRefundHold(account)
  return account
}

/**
 * The organization is the customer. Polar allows an email address one
 * customer of its own, and a person can own several organizations, so the
 * customer is a team kept under the organization's id with the buyer as its
 * owner rather than a customer with an email.
 */
export async function ensuredCustomer(
  ctx: ActionCtx,
  account: Doc<"accounts">
) {
  if (account.polar !== undefined) {
    return account.polar.customerId
  }

  const { organizationId } = account
  const email = (await ctx.auth.getUserIdentity())?.email

  if (email === undefined) {
    throw new Error("An email address is required to purchase.")
  }

  const customer = await polarRequest("/v1/customers/", {
    method: "POST",
    body: {
      type: "team",
      external_id: organizationId,
      owner: { email },
      metadata: polarMetadata({ organizationId }),
    },
  }).catch(
    // A customer from an attempt that was never recorded is still ours.
    async () =>
      await polarRequest(
        `/v1/customers/external/${encodeURIComponent(organizationId)}`
      )
  )
  const customerId = requireString(customer, "id")

  await ctx.runMutation(internal.billing.polar.data.attachCustomer, {
    organizationId,
    customerId,
  })

  return customerId
}

function billingReturnUrl(returnUrl: string, status: string) {
  const url = new URL(returnUrl)
  url.searchParams.set("billing", status)
  return url.toString()
}

export function requirePurchaseAgreement(args: {
  businessPurchase: boolean
  termsVersion: string
}) {
  if (args.businessPurchase !== true || args.termsVersion !== termsVersion) {
    throw new Error(
      "Confirm business use and accept the current terms before purchasing."
    )
  }
}
