import { useEffect, useState } from "react"
import { type BillingOverview } from "../billing/actions"
import { billingSearch } from "../billing/actions/return"

/** Where the plan stands. Until billing is read it counts as still to be
 *  bought; the flow moves on by itself should it turn out otherwise. */
export function planOf(billing: BillingOverview | undefined, paid: boolean) {
  const open =
    billing === undefined ||
    (billing.checkoutAvailable && (billing.account?.canSubscribe ?? true))

  if (!open) {
    return "settled"
  }

  return paid ? "confirming" : "open"
}

/** How the person came back from checkout, if they did. Polar says so in
 *  the address, which is read once and then cleared, so nothing later in
 *  the console takes it for a request to open Billing settings. */
export function useCheckoutReturn() {
  const [checkout] = useState(() => {
    const { billing } = billingSearch({
      billing: new URL(window.location.href).searchParams.get("billing"),
    })

    return billing === "subscribed" || billing === "canceled"
      ? billing
      : undefined
  })

  useEffect(() => {
    if (checkout === undefined) {
      return
    }

    const url = new URL(window.location.href)

    url.searchParams.delete("billing")
    window.history.replaceState(window.history.state, "", url)
  }, [checkout])

  return checkout
}
