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
import { readRecord, readString } from "../../shared/input"
import { requireRegion } from "../../shared/origin"

export const stripeEnvironmentNames = [
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
  ...planKeys.flatMap((plan) =>
    billingIntervals.map((interval) => priceEnvironmentName(plan, interval))
  ),
]

/** Deployment can serve the waitlist and trials without accepting payments.
 * Partial configuration must not create customers or initiate charges. */
export function isStripeConfigured() {
  return stripeEnvironmentNames.every(
    (name) => readEnvironmentVariable(name) !== undefined
  )
}

export function requireStripeConfiguration() {
  if (!isStripeConfigured()) {
    throw new Error("Billing is not available in this instance yet.")
  }
}

export function stripeMetadata(values: Record<string, string>) {
  return { ...values, region: requireRegion() }
}

export function belongsToRegion(object: Record<string, unknown>) {
  return readString(readRecord(object.metadata), "region") === requireRegion()
}

export function requireStripeSecretKey() {
  requireStripeConfiguration()
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
