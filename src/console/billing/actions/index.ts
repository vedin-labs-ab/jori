import { termsVersion } from "@contracts/billing"
import { useAction } from "convex/react"
import { type FunctionReturnType } from "convex/server"
import { useState } from "react"
import { showErrorToast } from "@/shared/console/error"
import { api } from "../../../../convex/_generated/api"

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
 * Every purchase flow ends on a Polar-hosted page, so these all resolve to a
 * redirect; errors surface as toasts and leave the page in place. `pending`
 * names the flow currently opening (through to the redirect itself) so its
 * button can spin and every money button can disable.
 */
export function useBillingCheckout(organizationId: string) {
  const [pending, setPending] = useState<CheckoutFlow | null>(null)
  const startPlanCheckout = usePlanCheckout()
  const startTopUpCheckout = useAction(
    api.billing.polar.checkout.startTopUpCheckout
  )
  const openPortal = useAction(api.billing.polar.checkout.openPortal)
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
    subscribe: () =>
      redirect(
        "plan",
        () => startPlanCheckout(organizationId),
        "Could not open checkout."
      ),
    topUp: (amountUsd: number) =>
      redirect(
        "top-up",
        () =>
          startTopUpCheckout({
            organizationId,
            amountUsd,
            ...purchaseAgreement(),
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

/** Starts Polar's checkout for the plan, answering with where it is. */
export function usePlanCheckout() {
  const start = useAction(api.billing.polar.checkout.startPlanCheckout)

  return (organizationId: string) =>
    start({ organizationId, ...purchaseAgreement() })
}

function purchaseAgreement() {
  return {
    returnUrl: billingReturnUrl(),
    businessPurchase: true,
    termsVersion,
  } as const
}
