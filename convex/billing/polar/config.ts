import {
  readEnvironmentVariable,
  requireEnvironmentVariable,
} from "../../shared/environment"
import { readRecord, readString } from "../../shared/input"
import { requireRegion } from "../../shared/origin"

const planEnvironmentName = "POLAR_PRODUCT_CLOUD"
const topUpEnvironmentName = "POLAR_PRODUCT_TOP_UP"

export const polarEnvironmentNames = [
  "POLAR_SERVER",
  "POLAR_ACCESS_TOKEN",
  "POLAR_WEBHOOK_SECRET",
  planEnvironmentName,
  topUpEnvironmentName,
]

const baseUrls: Record<string, string> = {
  production: "https://api.polar.sh",
  sandbox: "https://sandbox-api.polar.sh",
}

/** Deployment can serve the waitlist without accepting payments.
 * Partial configuration must not create customers or initiate charges. */
export function isPolarConfigured() {
  return polarEnvironmentNames.every(
    (name) => readEnvironmentVariable(name) !== undefined
  )
}

export function requirePolarConfiguration() {
  if (!isPolarConfigured()) {
    throw new Error("Billing is not available in this instance yet.")
  }
}

/** Both regions sell through one Polar organization, so everything Jori
 *  creates there says which region it belongs to. */
export function polarMetadata(values: Record<string, string>) {
  return { ...values, region: requireRegion() }
}

export function belongsToRegion(object: Record<string, unknown>) {
  return readString(readRecord(object.metadata), "region") === requireRegion()
}

export function requirePolarBaseUrl() {
  requirePolarConfiguration()
  const baseUrl = baseUrls[requireEnvironmentVariable("POLAR_SERVER")]

  if (baseUrl === undefined) {
    throw new Error("POLAR_SERVER must be sandbox or production.")
  }

  return baseUrl
}

export function requirePolarAccessToken() {
  requirePolarConfiguration()
  return requireEnvironmentVariable("POLAR_ACCESS_TOKEN")
}

export function requirePolarWebhookSecret() {
  return requireEnvironmentVariable("POLAR_WEBHOOK_SECRET")
}

export function planProductId() {
  return requireEnvironmentVariable(planEnvironmentName)
}

export function topUpProductId() {
  return requireEnvironmentVariable(topUpEnvironmentName)
}

/** Reverse checks for what Polar reports: whether a product is the plan or
 *  the top-up. An unknown product is neither, so unrelated products cannot
 *  activate an account or fund a wallet. */
export function sellsPlan(productId: unknown) {
  return readEnvironmentVariable(planEnvironmentName) === productId
}

export function sellsTopUp(productId: unknown) {
  return readEnvironmentVariable(topUpEnvironmentName) === productId
}
