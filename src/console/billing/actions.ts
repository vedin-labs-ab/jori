import { type BillingInterval, type PlanKey } from "@contracts/billing"
import { useAction } from "convex/react"
import { type FunctionReturnType } from "convex/server"
import { api } from "../../../convex/_generated/api"
import { showErrorToast } from "../shared/error"

export type BillingOverview = FunctionReturnType<
  typeof api.billing.console.overview
>

export type BillingAccount = NonNullable<BillingOverview["account"]>

export function billingReturnUrl() {
  return `${window.location.origin}/billing`
}

/**
 * Every purchase flow ends on a Stripe-hosted page, so these all resolve to a
 * redirect; errors surface as toasts and leave the page in place.
 */
export function useBillingCheckout(tenantId: string) {
  const startPlanCheckout = useAction(
    api.billing.stripe.checkout.startPlanCheckout
  )
  const startTopUpCheckout = useAction(
    api.billing.stripe.checkout.startTopUpCheckout
  )
  const openPortal = useAction(api.billing.stripe.checkout.openPortal)

  return {
    choosePlan: (plan: PlanKey, interval: BillingInterval) =>
      redirect(
        () =>
          startPlanCheckout({
            tenantId,
            plan,
            interval,
            returnUrl: billingReturnUrl(),
          }),
        "Could not open checkout."
      ),
    topUp: (amountUsd: number) =>
      redirect(
        () =>
          startTopUpCheckout({
            tenantId,
            amountUsd,
            returnUrl: billingReturnUrl(),
          }),
        "Could not open checkout."
      ),
    managePortal: () =>
      redirect(
        () => openPortal({ tenantId, returnUrl: billingReturnUrl() }),
        "Could not open the billing portal."
      ),
  }
}

async function redirect(
  start: () => Promise<{ url: string }>,
  fallback: string
) {
  try {
    const { url } = await start()

    window.location.assign(url)
  } catch (error) {
    showErrorToast(error, fallback)
  }
}
