import { afterEach, beforeEach, expect, test, vi } from "vitest"
import { stripeRequest } from "./client"
import {
  isStripeConfigured,
  requireStripeConfiguration,
  stripeEnvironmentNames,
} from "./config"

beforeEach(() => {
  for (const name of stripeEnvironmentNames) {
    vi.stubEnv(name, "configured-test-value")
  }
})
afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})

test("billing readiness requires credentials, webhook verification and all prices", () => {
  expect(stripeEnvironmentNames).toHaveLength(6)
  expect(isStripeConfigured()).toBe(true)
  expect(() => requireStripeConfiguration()).not.toThrow()
})

test.each(
  stripeEnvironmentNames
)("missing %s disables every Stripe request", async (name) => {
  const fetch = vi.fn()
  vi.stubGlobal("fetch", fetch)
  vi.stubEnv(name, "  ")
  expect(isStripeConfigured()).toBe(false)
  await expect(stripeRequest("/v1/payment_intents")).rejects.toThrow(
    "Billing is not available in this instance yet."
  )
  expect(fetch).not.toHaveBeenCalled()
})

test("an unconfigured instance cannot use another region's configuration", () => {
  for (const name of stripeEnvironmentNames) {
    vi.stubEnv(name, "")
    vi.stubEnv(`${name}_US`, "other-region-value")
  }
  expect(isStripeConfigured()).toBe(false)
})
