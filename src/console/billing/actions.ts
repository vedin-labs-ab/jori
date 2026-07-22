import { type BillingInterval, type PlanKey } from "@contracts/billing"
import { useAction } from "convex/react"
import { type FunctionReturnType } from "convex/server"
import { useState } from "react"
import { api } from "../../../convex/_generated/api"
import { showErrorToast } from "../shared/error"

export type BillingOverview = FunctionReturnType<
  typeof api.billing.console.overview
>

export type BillingAccount = NonNullable<BillingOverview["account"]>

type CheckoutFlow = "plan" | "top-up" | "portal"

export function billingReturnUrl(reopenSettings = false) {
  const url = new URL("/console", window.location.origin)

  if (reopenSettings) {
    url.searchParams.set("billing", "portal")
  }

  return url.toString()
}

/**
 * Every purchase flow ends on a Stripe-hosted page, so these all resolve to a
 * redirect; errors surface as toasts and leave the page in place. `pending`
 * names the flow currently opening (through to the redirect itself) so its
 * button can spin and every money button can disable.
 */
export function useBillingCheckout(organizationId: string) {
  const [pending, setPending] = useState<CheckoutFlow | null>(null)
  const startPlanCheckout = useAction(
    api.billing.stripe.checkout.startPlanCheckout
  )
  const startTopUpCheckout = useAction(
    api.billing.stripe.checkout.startTopUpCheckout
  )
  const openPortal = useAction(api.billing.stripe.checkout.openPortal)
  const portalReturnUrl = billingReturnUrl(true)

  const redirect = async (
    flow: CheckoutFlow,
    start: () => Promise<{ url: string }>,
    fallback: string
  ) => {
    setPending(flow)

    try {
      const { url } = await start()

      window.location.assign(url)
    } catch (error) {
      showErrorToast(error, fallback)
      setPending(null)
    }
  }

  return {
    pending,
    choosePlan: (plan: PlanKey, interval: BillingInterval) =>
      redirect(
        "plan",
        () =>
          startPlanCheckout({
            organizationId,
            plan,
            interval,
            returnUrl: billingReturnUrl(),
          }),
        "Could not open checkout."
      ),
    topUp: (amountUsd: number) =>
      redirect(
        "top-up",
        () =>
          startTopUpCheckout({
            organizationId,
            amountUsd,
            returnUrl: billingReturnUrl(),
          }),
        "Could not open checkout."
      ),
    managePortal: () =>
      redirect(
        "portal",
        () => openPortal({ organizationId, returnUrl: portalReturnUrl }),
        "Could not open the billing portal."
      ),
  }
}
