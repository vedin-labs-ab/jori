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
