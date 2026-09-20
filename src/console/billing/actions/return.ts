export const billingReturnToasts = {
  storage: "Checkout submitted. Storage increases once payment is confirmed.",
  subscribed:
    "Checkout submitted. Your plan updates once payment is confirmed.",
  "topped-up":
    "Top-up submitted. Your balance updates once payment is confirmed.",
}

type BillingReturn = "portal" | "canceled" | keyof typeof billingReturnToasts

export function billingSearch(search: { billing?: unknown }): {
  billing?: BillingReturn
} {
  const { billing } = search
  return typeof billing === "string" &&
    (billing === "portal" ||
      billing === "canceled" ||
      Object.hasOwn(billingReturnToasts, billing))
    ? { billing: billing as BillingReturn }
    : {}
}

/** How the person came back from one of Polar's pages, as the address has
 *  it. */
export function readBillingReturn() {
  return billingSearch({
    billing: new URL(window.location.href).searchParams.get("billing"),
  }).billing
}

/** Takes the return off the address once it has been acted on, so nothing
 *  later reads it again. */
export function clearBillingReturn() {
  const url = new URL(window.location.href)

  url.searchParams.delete("billing")
  window.history.replaceState(window.history.state, "", url)
}
