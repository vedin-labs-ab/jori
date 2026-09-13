import {
  readEnvironmentVariable,
  requireEnvironmentVariable,
} from "../../shared/environment"
import { readRecord, readString } from "../../shared/input"
import { requireRegion } from "../../shared/origin"

const priceEnvironmentName = "STRIPE_PRICE_CLOUD"

export const stripeEnvironmentNames = [
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
  priceEnvironmentName,
]

/** Deployment can serve the waitlist without accepting payments.
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

export function stripePriceId() {
  return requireEnvironmentVariable(priceEnvironmentName)
}

/** Reverse check for webhook payloads: whether a Stripe price is the plan.
 *  An unknown price is not, so unrelated products cannot activate an
 *  account. */
export function sellsPlan(priceId: string) {
  return readEnvironmentVariable(priceEnvironmentName) === priceId
}
