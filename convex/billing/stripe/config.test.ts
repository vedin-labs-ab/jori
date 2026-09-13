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

test("billing readiness requires credentials, webhook verification and the plan's price", () => {
  expect(stripeEnvironmentNames).toEqual([
    "STRIPE_SECRET_KEY",
    "STRIPE_WEBHOOK_SECRET",
    "STRIPE_PRICE_CLOUD",
  ])
  expect(isStripeConfigured()).toBe(true)
  expect(() => requireStripeConfiguration()).not.toThrow()
})

test.each(stripeEnvironmentNames)(
  "missing %s disables every Stripe request",
  async (name) => {
    const fetch = vi.fn()
    vi.stubGlobal("fetch", fetch)
    vi.stubEnv(name, "  ")
    expect(isStripeConfigured()).toBe(false)
    await expect(stripeRequest("/v1/payment_intents")).rejects.toThrow(
      "Billing is not available in this instance yet."
    )
    expect(fetch).not.toHaveBeenCalled()
  }
)

test("an unconfigured instance cannot use another region's configuration", () => {
  for (const name of stripeEnvironmentNames) {
    vi.stubEnv(name, "")
    vi.stubEnv(`${name}_US`, "other-region-value")
  }
  expect(isStripeConfigured()).toBe(false)
})

test.each([400, 401, 429, 503])(
  "Stripe HTTP %s errors omit reflected provider content without retrying",
  async (status) => {
    const fetch = vi.fn(async () =>
      Response.json(
        { error: { message: "Reflected private customer value" } },
        { status }
      )
    )
    vi.stubGlobal("fetch", fetch)
    await expect(stripeRequest("/v1/payment_intents")).rejects.toThrow(
      `Stripe request failed (HTTP ${status})`
    )
    expect(fetch).toHaveBeenCalledTimes(1)
  }
)

test("malformed successful Stripe responses cannot expose parser snippets", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => new Response("Private value"))
  )
  await expect(stripeRequest("/v1/payment_intents")).rejects.toThrow(
    "Stripe returned invalid JSON"
  )
})
