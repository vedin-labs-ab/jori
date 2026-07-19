import {
  type BillingInterval,
  billingIntervals,
  type PlanKey,
  planKeys,
} from "../../../contracts/billing"
import {
  readEnvironmentVariable,
  requireEnvironmentVariable,
} from "../../shared/environment"

export function requireStripeSecretKey() {
  return requireEnvironmentVariable("STRIPE_SECRET_KEY")
}

export function requireStripeWebhookSecret() {
  return requireEnvironmentVariable("STRIPE_WEBHOOK_SECRET")
}

function priceEnvironmentName(plan: PlanKey, interval: BillingInterval) {
  return `STRIPE_PRICE_${plan.toUpperCase()}_${interval.toUpperCase()}`
}

export function stripePriceId(plan: PlanKey, interval: BillingInterval) {
  return requireEnvironmentVariable(priceEnvironmentName(plan, interval))
}

/** Reverse mapping for webhook payloads: which plan a Stripe price sells.
 *  Unknown prices return undefined so unrelated products cannot flip plans. */
export function planForPriceId(priceId: string) {
  for (const plan of planKeys) {
    for (const interval of billingIntervals) {
      if (
        readEnvironmentVariable(priceEnvironmentName(plan, interval)) ===
        priceId
      ) {
        return { plan, interval }
      }
    }
  }

  return undefined
}
